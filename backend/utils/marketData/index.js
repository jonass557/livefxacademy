// utils/marketData/index.js
// Registre des fournisseurs de données de marché. Pour ajouter un fournisseur :
// implémenter l'interface de provider.js puis l'enregistrer ci-dessous.
const deriv = require('./derivProvider')
const binance = require('./binanceProvider')
const yahoo = require('./yahooProvider')
const mt5 = require('./mt5Provider')
const { TIMEFRAMES } = require('./provider')

const PROVIDERS = { deriv, binance, yahoo, mt5 }

function getProvider(name) {
  const p = PROVIDERS[name]
  if (!p) throw new Error('Fournisseur inconnu : ' + name)
  if (p.available === false) throw new Error(p.label)
  return p
}

// Métadonnées pour alimenter le formulaire côté client.
function listProviders() {
  return Object.values(PROVIDERS).map((p) => ({
    name: p.name,
    label: p.label,
    available: p.available !== false,
    symbols: p.listSymbols(),
  }))
}

module.exports = { getProvider, listProviders, PROVIDERS, TIMEFRAMES }
