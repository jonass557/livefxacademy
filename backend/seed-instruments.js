// Seed des instruments du Trading Demo (idempotent : upsert par symbole).
// Usage : node seed-instruments.js
//
// Mapping des symboles fournisseur :
//  - FOREX / METALS / INDICES : Yahoo Finance (EURUSD=X, GC=F futures, ^GSPC…), prix live via polling REST, sans clé.
//  - CRYPTO : Binance public (bookTicker → bid/ask réels), sans clé.
//  - SYNTHETIC : catégorie préparée mais DÉSACTIVÉE (enabled=false, provider_symbol=null)
//    → aucun prix inventé tant qu'un fournisseur réel n'est pas branché.
const mongoose = require('mongoose');
const connectDB = require('./db');
const Instrument = require('./models/Instrument');

// Helpers de configuration par famille.
const fx = (symbol, name, quote) => {
  const jpy = quote === 'JPY';
  return {
    symbol, name, category: 'FOREX', quote_currency: quote,
    contract_size: 100000,
    pip_size: jpy ? 0.01 : 0.0001,
    tick_size: jpy ? 0.001 : 0.00001,
    digits: jpy ? 3 : 5,
    tick_value: (jpy ? 0.001 : 0.00001) * 100000, // valeur d'un tick pour 1 lot, en devise quote
    min_volume: 0.01, max_volume: 100, volume_step: 0.01,
    spread_pips: 1.5,
    provider: 'yahoo', provider_symbol: symbol + '=X',
  };
};

const metal = (symbol, name, pip, digits, contract, ys) => ({
  symbol, name, category: 'METALS', quote_currency: 'USD',
  contract_size: contract, pip_size: pip, tick_size: pip / 10, digits,
  tick_value: (pip / 10) * contract,
  min_volume: 0.01, max_volume: 50, volume_step: 0.01, spread_pips: 3,
  provider: 'yahoo', provider_symbol: ys,
});

const index = (symbol, name, quote, providerSymbol) => ({
  symbol, name, category: 'INDICES', quote_currency: quote,
  contract_size: 1, pip_size: 1, tick_size: 0.01, digits: 2, tick_value: 0.01,
  min_volume: 0.01, max_volume: 50, volume_step: 0.01, spread_pips: 2,
  provider: 'yahoo', provider_symbol: providerSymbol,
});

const crypto = (symbol, name, digits, binanceSymbol) => ({
  symbol, name, category: 'CRYPTO', quote_currency: 'USD',
  contract_size: 1, pip_size: Math.pow(10, -digits), tick_size: Math.pow(10, -digits), digits,
  tick_value: Math.pow(10, -digits),
  min_volume: 0.01, max_volume: 100, volume_step: 0.01, spread_pips: 5,
  provider: 'binance', provider_symbol: binanceSymbol,
});

const synth = (symbol, name) => ({
  symbol, name, category: 'SYNTHETIC', quote_currency: 'USD', enabled: false,
  contract_size: 1, pip_size: 0.01, tick_size: 0.01, digits: 2, tick_value: 0.01,
  min_volume: 0.01, max_volume: 100, volume_step: 0.01, spread_pips: 0,
  provider: 'deriv', provider_symbol: null, // désactivé : aucun prix tant que non branché
});

const INSTRUMENTS = [
  // --- FOREX (23) ---
  fx('EURUSD', 'Euro / Dollar US', 'USD'),
  fx('GBPUSD', 'Livre / Dollar US', 'USD'),
  fx('USDJPY', 'Dollar US / Yen', 'JPY'),
  fx('USDCHF', 'Dollar US / Franc suisse', 'CHF'),
  fx('USDCAD', 'Dollar US / Dollar canadien', 'CAD'),
  fx('AUDUSD', 'Dollar australien / Dollar US', 'USD'),
  fx('NZDUSD', 'Dollar NZ / Dollar US', 'USD'),
  fx('EURGBP', 'Euro / Livre', 'GBP'),
  fx('EURJPY', 'Euro / Yen', 'JPY'),
  fx('GBPJPY', 'Livre / Yen', 'JPY'),
  fx('EURCHF', 'Euro / Franc suisse', 'CHF'),
  fx('EURAUD', 'Euro / Dollar australien', 'AUD'),
  fx('EURNZD', 'Euro / Dollar NZ', 'NZD'),
  fx('GBPAUD', 'Livre / Dollar australien', 'AUD'),
  fx('GBPCAD', 'Livre / Dollar canadien', 'CAD'),
  fx('GBPNZD', 'Livre / Dollar NZ', 'NZD'),
  fx('AUDJPY', 'Dollar australien / Yen', 'JPY'),
  fx('CADJPY', 'Dollar canadien / Yen', 'JPY'),
  fx('CHFJPY', 'Franc suisse / Yen', 'JPY'),
  fx('AUDCAD', 'Dollar australien / Dollar canadien', 'CAD'),
  fx('AUDNZD', 'Dollar australien / Dollar NZ', 'NZD'),
  fx('NZDCAD', 'Dollar NZ / Dollar canadien', 'CAD'),
  fx('NZDJPY', 'Dollar NZ / Yen', 'JPY'),

  // --- CRYPTO (8) — Binance public, bid/ask réels ---
  crypto('BTCUSD', 'Bitcoin', 2, 'BTCUSDT'),
  crypto('ETHUSD', 'Ethereum', 2, 'ETHUSDT'),
  crypto('BNBUSD', 'BNB', 2, 'BNBUSDT'),
  crypto('XRPUSD', 'XRP', 4, 'XRPUSDT'),
  crypto('SOLUSD', 'Solana', 2, 'SOLUSDT'),
  crypto('ADAUSD', 'Cardano', 4, 'ADAUSDT'),
  crypto('DOGEUSD', 'Dogecoin', 5, 'DOGEUSDT'),
  crypto('LTCUSD', 'Litecoin', 2, 'LTCUSDT'),

  // --- METALS (4) — Yahoo futures ---
  metal('XAUUSD', 'Or / Dollar US', 0.1, 2, 100, 'GC=F'),
  metal('XAGUSD', 'Argent / Dollar US', 0.01, 3, 5000, 'SI=F'),
  metal('XPTUSD', 'Platine / Dollar US', 0.1, 2, 100, 'PL=F'),
  metal('XPDUSD', 'Palladium / Dollar US', 0.1, 2, 100, 'PA=F'),

  // --- INDICES (7) — Yahoo (^symbole) ---
  index('US30', 'Wall Street 30', 'USD', '^DJI'),
  index('NAS100', 'US Tech 100', 'USD', '^NDX'),
  index('SPX500', 'US 500', 'USD', '^GSPC'),
  index('GER40', 'Allemagne 40', 'EUR', '^GDAXI'),
  index('UK100', 'UK 100', 'GBP', '^FTSE'),
  index('FRA40', 'France 40', 'EUR', '^FCHI'),
  index('JP225', 'Japon 225', 'JPY', '^N225'),

  // --- SYNTHETIC (désactivés : architecture prête, aucun prix inventé) ---
  synth('VOL75', 'Volatility 75 Index'),
  synth('VOL100', 'Volatility 100 Index'),
  synth('BOOM1000', 'Boom 1000 Index'),
  synth('CRASH1000', 'Crash 1000 Index'),
];

async function seed() {
  await connectDB();
  let created = 0, updated = 0;
  for (const inst of INSTRUMENTS) {
    // `enabled` uniquement à l'insertion → préserve les toggles admin lors d'un re-seed.
    const { enabled, ...fields } = inst;
    const res = await Instrument.updateOne(
      { symbol: inst.symbol },
      { $set: fields, $setOnInsert: { enabled: enabled === undefined ? true : enabled } },
      { upsert: true }
    );
    if (res.upsertedCount) created++;
    else if (res.modifiedCount) updated++;
  }
  console.log(`✅ Instruments seed terminé : ${created} créés, ${updated} mis à jour, ${INSTRUMENTS.length} au total.`);
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed instruments échoué :', err.message);
  process.exit(1);
});
