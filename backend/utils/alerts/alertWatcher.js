// utils/alerts/alertWatcher.js
// Surveillance SERVEUR des alertes de prix (façon TradingView / MT5).
// Écoute les cotations temps réel du hub (liveFeed).
// Déclenche l'alerte dès que le prix cible est atteint ou franchi,
// même si l'utilisateur est déconnecté ou a fermé son navigateur,
// et lui envoie un email de notification immédiat (via mailer).

const liveFeed = require('../marketData/liveFeed');
const { PriceAlert, User, DemoAccount, Position, PendingOrder } = require('../../models');
const { sendMail } = require('../mailer');

function inferLevelTypeFromNote(note = '', currentLevelType = 'price') {
  if (currentLevelType === 'sl' || currentLevelType === 'tp') return currentLevelType;
  const txt = String(note || '').trim();
  if (/(\b(sl)\b|stop\s*[-_]?\s*loss)/i.test(txt)) return 'sl';
  if (/(\b(tp)\b|take\s*[-_]?\s*profit)/i.test(txt)) return 'tp';
  return 'price';
}

async function resolveAlertLevelType(alert) {
  const fromFieldOrNote = inferLevelTypeFromNote(alert?.note, alert?.level_type);
  if (fromFieldOrNote === 'sl' || fromFieldOrNote === 'tp') return fromFieldOrNote;
  try {
    const userId = alert?.user_id?._id || alert?.user_id;
    const tp = Number(alert?.target_price);
    if (!userId || !tp || isNaN(tp)) return 'price';
    const account = await DemoAccount.findOne({ user_id: userId }).select('_id').lean();
    if (!account) return 'price';
    const rawSym = String(alert.symbol || '').replace(/^frx/i, '').replace(/[\/\s_-]/g, '').toUpperCase();
    const [positions, orders] = await Promise.all([
      Position.find({ demo_account_id: account._id, status: 'OPEN' }).select('symbol stop_loss take_profit').lean(),
      PendingOrder.find({ demo_account_id: account._id, status: 'PENDING' }).select('symbol stop_loss take_profit').lean(),
    ]);
    const allItems = [...(positions || []), ...(orders || [])];
    for (const item of allItems) {
      const itemSym = String(item.symbol || '').replace(/^frx/i, '').replace(/[\/\s_-]/g, '').toUpperCase();
      if (rawSym && itemSym && rawSym !== itemSym) continue;
      if (item.stop_loss != null && Math.abs(tp - Number(item.stop_loss)) / Math.max(Math.abs(tp), 1e-9) <= 0.0025) {
        return 'sl';
      }
      if (item.take_profit != null && Math.abs(tp - Number(item.take_profit)) / Math.max(Math.abs(tp), 1e-9) <= 0.0025) {
        return 'tp';
      }
    }
  } catch (_) {}
  return 'price';
}

async function sendAlertEmail(alert, currentPrice) {
  if (!alert || alert.notify_email === false) return false;
  try {
    let userObj = alert.user_id;
    const userId = alert.user_id?._id || alert.user_id;
    if (!userObj || !userObj.email) {
      userObj = await User.findById(userId).select('email full_name').lean();
    }
    if (!userObj || !userObj.email) {
      console.warn(`[alertWatcher] Email impossible : utilisateur introuvable pour l'alerte ${alert._id}`);
      return false;
    }

    const userEmail = userObj.email;
    const userName = userObj.full_name || 'Trader';
    const symbol = alert.symbol;
    const tp = alert.target_price;
    const execPrice = currentPrice ?? tp;
    const levelType = await resolveAlertLevelType(alert);

    const condLabel = alert.condition === 'above'
      ? 'franchi à la hausse (>=)'
      : alert.condition === 'below'
      ? 'franchi à la baisse (<=)'
      : 'croisé';

    let subject = `🔔 Alerte LivefxTrading : ${symbol} a atteint ${tp}`;
    let title = `Alerte de Prix Déclenchée : ${symbol}`;
    let introHtml = `<p>Votre alerte de prix configurée sur <strong>${symbol}</strong> vient de se déclencher :</p>`;
    let accentColor = '#6366f1';
    let targetBadgeHtml = `<p style="margin:4px 0;"><strong>Prix cible :</strong> <span style="font-size:16px; font-weight:bold; color:#4f46e5;">${tp}</span></p>`;

    if (levelType === 'sl') {
      subject = `🛑 Alerte Stop Loss LivefxTrading : Le Stop Loss (${tp}) sur ${symbol} a été atteint`;
      title = `🛑 Stop Loss Atteint : ${symbol}`;
      introHtml = `<p><strong>Le Stop Loss (${tp}) sur ${symbol} a été atteint par l'alerte placée !</strong></p>`;
      accentColor = '#ef4444';
      targetBadgeHtml = `<p style="margin:4px 0;"><strong>Niveau atteint :</strong> <span style="font-size:16px; font-weight:bold; color:#dc2626;">🛑 Stop Loss (SL) @ ${tp}</span></p>`;
    } else if (levelType === 'tp') {
      subject = `🎯 Alerte Take Profit LivefxTrading : Le Take Profit (${tp}) sur ${symbol} a été atteint`;
      title = `🎯 Take Profit Atteint : ${symbol}`;
      introHtml = `<p><strong>Le Take Profit (${tp}) sur ${symbol} a été atteint par l'alerte placée !</strong></p>`;
      accentColor = '#22c55e';
      targetBadgeHtml = `<p style="margin:4px 0;"><strong>Niveau atteint :</strong> <span style="font-size:16px; font-weight:bold; color:#16a34a;">🎯 Take Profit (TP) @ ${tp}</span></p>`;
    }

    const html = `
      <p>Bonjour <strong>${userName}</strong>,</p>
      ${introHtml}
      <div style="background:#f3f4f6; border-left:4px solid ${accentColor}; padding:15px; margin:15px 0; border-radius:4px;">
        <p style="margin:4px 0;"><strong>Instrument :</strong> ${symbol}</p>
        ${targetBadgeHtml}
        <p style="margin:4px 0;"><strong>Prix d'exécution :</strong> ${execPrice}</p>
        <p style="margin:4px 0;"><strong>Condition :</strong> ${condLabel}</p>
        ${alert.note ? `<p style="margin:4px 0;"><strong>Note / Commentaire :</strong> ${alert.note}</p>` : ''}
        <p style="margin:4px 0; font-size:12px; color:#6b7280;">Déclenché le : ${new Date().toLocaleString('fr-FR')}</p>
      </div>
      <p style="margin-top:20px;">
        <a href="${process.env.FRONTEND_URL || 'https://livefx-trading.com'}/dashboard?section=trading-demo"
           style="display:inline-block; background:#4f46e5; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
          Accéder au Graphique en Direct
        </a>
      </p>
    `;

    const sent = await sendMail({ to: userEmail, subject, title, html });
    if (sent) {
      console.log(`[alertWatcher] Email envoyé à ${userEmail} pour ${symbol} @ ${tp}`);
    }
    return sent;
  } catch (mailErr) {
    console.error(`[alertWatcher] Erreur envoi email:`, mailErr.message);
    return false;
  }
}

class AlertWatcher {
  constructor() {
    this.started = false;
    this.lastPrices = new Map(); // symbol -> last known mid
    this.processing = new Set();  // symboles en cours de traitement
  }

  start() {
    if (this.started) return;
    this.started = true;

    liveFeed.on('quote', (quote) => {
      this.handleQuote(quote).catch((err) => {
        console.error(`[alertWatcher] Erreur traitement quote ${quote?.symbol}:`, err.message);
      });
    });

    console.log('✅ [alertWatcher] Surveillance serveur des alertes de prix démarrée');
  }

  async handleQuote(quote) {
    if (!quote || !quote.symbol || !(quote.mid > 0)) return;
    const rawSym = String(quote.symbol).trim();
    const symbol = rawSym.replace(/^frx/i, '').replace(/[\/\s_-]/g, '').toUpperCase();
    const currentPrice = Number(quote.mid);
    const prevPrice = this.lastPrices.get(symbol) ?? currentPrice;
    this.lastPrices.set(symbol, currentPrice);

    if (this.processing.has(symbol)) return;
    this.processing.add(symbol);

    try {
      // Trouver toutes les alertes actives pour ce symbole (avec ou sans préfixe frx)
      const activeAlerts = await PriceAlert.find({
        status: 'active',
        $or: [
          { symbol },
          { symbol: `FRX${symbol}` },
          { symbol: `frx${symbol}` },
          { symbol: new RegExp(`^(frx)?${symbol}$`, 'i') },
        ],
      }).populate('user_id');

      if (!activeAlerts || activeAlerts.length === 0) return;

      for (const alert of activeAlerts) {
        // Vérifier expiration
        if (alert.expires_at && new Date() > new Date(alert.expires_at)) {
          alert.status = 'triggered';
          await alert.save();
          continue;
        }

        const tp = Number(alert.target_price);
        if (!tp || isNaN(tp)) continue;

        // Si l'alerte n'avait pas encore de prix de référence à la création, on l'initialise
        if (alert.created_price == null) {
          alert.created_price = prevPrice;
        }
        const refPrice = Number(alert.created_price);

        let isHit = false;
        if (alert.condition === 'above') {
          isHit = currentPrice >= tp && (prevPrice <= tp || refPrice <= tp);
        } else if (alert.condition === 'below') {
          isHit = currentPrice <= tp && (prevPrice >= tp || refPrice >= tp);
        } else {
          // 'crossing' (croisement dans un sens ou dans l'autre)
          const crossedUp = (prevPrice <= tp && currentPrice >= tp) || (refPrice <= tp && currentPrice >= tp);
          const crossedDown = (prevPrice >= tp && currentPrice <= tp) || (refPrice >= tp && currentPrice <= tp);
          const nearHit = Math.abs(currentPrice - tp) <= Math.abs(tp) * 0.0001;
          isHit = crossedUp || crossedDown || nearHit;
        }

        if (isHit) {
          const isEveryTime = alert.trigger_frequency === 'every_time';
          const alreadyEmailed = alert.email_sent && !isEveryTime;

          if (!isEveryTime) {
            alert.status = 'triggered';
          } else {
            alert.created_price = currentPrice;
          }
          alert.triggered_at = new Date();
          alert.triggered_price = currentPrice;

          if (!alreadyEmailed && alert.notify_email) {
            const sent = await sendAlertEmail(alert, currentPrice);
            if (sent) {
              alert.email_sent = true;
            }
          }

          await alert.save();
        }
      }
    } finally {
      this.processing.delete(symbol);
    }
  }
}

const instance = new AlertWatcher();
instance.sendAlertEmail = sendAlertEmail;
module.exports = instance;

