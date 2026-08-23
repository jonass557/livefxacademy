// utils/tradingDemo/pricing.js
// Tarification et conversion de devises pour le compte démo.
// - Bid/Ask proviennent du hub temps réel (dérivés du spread configuré).
// - Conversion du P&L vers la devise du compte (USD) selon la devise de cotation
//   de l'instrument, via les cotations live disponibles (jamais de taux inventé).
const liveFeed = require('../marketData/liveFeed');

// Prix d'exécution côté serveur : BUY paie l'ASK, SELL touche le BID.
function executionPrice(side, quote) {
  if (!quote) return null;
  return side === 'BUY' ? quote.ask : quote.bid;
}

// Prix de clôture d'une position : on ferme un BUY au BID, un SELL à l'ASK.
function closePrice(side, quote) {
  if (!quote) return null;
  return side === 'BUY' ? quote.bid : quote.ask;
}

// Taux devise→USD à partir des cotations live. Retourne null si indisponible.
function rateToUSD(currency) {
  if (!currency || currency === 'USD') return 1;
  const direct = liveFeed.getQuote(`${currency}USD`); // ex GBPUSD, EURUSD, AUDUSD, NZDUSD
  if (direct && direct.mid > 0) return direct.mid;
  const inverse = liveFeed.getQuote(`USD${currency}`); // ex USDJPY, USDCHF, USDCAD
  if (inverse && inverse.mid > 0) return 1 / inverse.mid;
  return null;
}

// P&L d'une position, en devise du compte (USD).
// profit_quote = (exit - entry) * contract_size * volume * dir ; puis quote→USD.
// `instrument` : document Instrument (contract_size, quote_currency).
function computeProfit(instrument, side, volume, entryPrice, exitPrice) {
  if (!(entryPrice > 0) || !(exitPrice > 0)) return 0;
  const dir = side === 'BUY' ? 1 : -1;
  const profitQuote = (exitPrice - entryPrice) * instrument.contract_size * volume * dir;
  const rate = rateToUSD(instrument.quote_currency);
  // Si le taux de conversion est indisponible, on suppose 1 (démo) plutôt que d'échouer.
  return profitQuote * (rate == null ? 1 : rate);
}

// Marge requise pour ouvrir : (contract_size * volume * prix) / levier, convertie en USD.
// La base de marge est exprimée dans la devise de BASE de l'instrument pour le FX ;
// pour rester simple et cohérent en démo, on l'exprime via le prix courant en quote
// puis conversion quote→USD.
function requiredMargin(instrument, volume, price, leverage) {
  const notionalQuote = instrument.contract_size * volume * price;
  const rate = rateToUSD(instrument.quote_currency);
  const notionalUSD = notionalQuote * (rate == null ? 1 : rate);
  return notionalUSD / (leverage || 100);
}

module.exports = { executionPrice, closePrice, rateToUSD, computeProfit, requiredMargin };
