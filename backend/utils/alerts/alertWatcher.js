// utils/alerts/alertWatcher.js
// Surveillance SERVEUR des alertes de prix (façon TradingView / MT5).
// Écoute les cotations temps réel du hub (liveFeed).
// Déclenche l'alerte dès que le prix cible est atteint ou franchi,
// même si l'utilisateur est déconnecté ou a fermé son navigateur,
// et lui envoie un email de notification immédiat (via mailer).

const liveFeed = require('../marketData/liveFeed');
const { PriceAlert, User } = require('../../models');
const { sendMail } = require('../mailer');

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
    const symbol = quote.symbol;
    const currentPrice = quote.mid;
    const prevPrice = this.lastPrices.get(symbol) ?? quote.mid;
    this.lastPrices.set(symbol, currentPrice);

    if (this.processing.has(symbol)) return;
    this.processing.add(symbol);

    try {
      // Trouver toutes les alertes actives pour ce symbole
      const activeAlerts = await PriceAlert.find({ symbol, status: 'active' }).populate('user_id');
      if (!activeAlerts || activeAlerts.length === 0) return;

      for (const alert of activeAlerts) {
        // Vérifier expiration
        if (alert.expires_at && new Date() > new Date(alert.expires_at)) {
          alert.status = 'triggered';
          await alert.save();
          continue;
        }

        let isHit = false;
        const tp = alert.target_price;
        const refPrice = alert.created_price ?? prevPrice;

        if (alert.condition === 'above') {
          isHit = currentPrice >= tp && (prevPrice < tp || refPrice < tp);
        } else if (alert.condition === 'below') {
          isHit = currentPrice <= tp && (prevPrice > tp || refPrice > tp);
        } else {
          // 'crossing' (croisement dans un sens ou dans l'autre)
          isHit =
            (prevPrice <= tp && currentPrice >= tp) ||
            (prevPrice >= tp && currentPrice <= tp) ||
            (refPrice <= tp && currentPrice >= tp) ||
            (refPrice >= tp && currentPrice <= tp);
        }

        if (isHit) {
          const isEveryTime = alert.trigger_frequency === 'every_time';
          if (!isEveryTime) {
            alert.status = 'triggered';
          } else {
            // Réinitialiser le prix de référence pour le prochain déclenchement
            alert.created_price = currentPrice;
          }
          alert.triggered_at = new Date();
          alert.triggered_price = currentPrice;

          // Envoi d'email de notification si configuré
          if (alert.notify_email && alert.user_id && alert.user_id.email) {
            try {
              const userEmail = alert.user_id.email;
              const userName = alert.user_id.full_name || 'Trader';
              const condLabel = alert.condition === 'above'
                ? 'franchi à la hausse (>=)'
                : alert.condition === 'below'
                ? 'franchi à la baisse (<=)'
                : 'croisé';

              const subject = `🔔 Alerte Livefx : ${symbol} a atteint ${tp}`;
              const title = `Alerte de Prix Déclenchée : ${symbol}`;
              const html = `
                <p>Bonjour <strong>${userName}</strong>,</p>
                <p>Votre alerte de prix configurée sur <strong>${symbol}</strong> vient de se déclencher :</p>
                <div style="background:#f3f4f6; border-left:4px solid #6366f1; padding:15px; margin:15px 0; border-radius:4px;">
                  <p style="margin:4px 0;"><strong>Instrument :</strong> ${symbol}</p>
                  <p style="margin:4px 0;"><strong>Prix cible :</strong> <span style="font-size:16px; font-weight:bold; color:#4f46e5;">${tp}</span></p>
                  <p style="margin:4px 0;"><strong>Prix d'exécution :</strong> ${currentPrice}</p>
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
                alert.email_sent = true;
                console.log(`[alertWatcher] Email envoyé à ${userEmail} pour ${symbol} @ ${tp}`);
              }
            } catch (mailErr) {
              console.error(`[alertWatcher] Erreur envoi email:`, mailErr.message);
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

module.exports = new AlertWatcher();
