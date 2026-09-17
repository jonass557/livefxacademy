// Récupération et normalisation du calendrier économique.
//
// Stratégie multi-sources (depuis 17/09/2026) :
// - Base : Forex Factory (flux JSON publics gratuits, sans clé API).
// - Complément : Trading Economics (si TE_API_KEY configurée) pour actual, revised.
// - Enrichissement local : devise → pays + drapeau, titre → type d'événement,
//   type → source officielle (BLS, Fed, Census…).
//
// Rétrocompatibilité : buildEventId identique (clé de cache d'analyses IA
// inchangée), tous les anciens champs présents.

const providers = require('./providers');

// Récupère les événements sur une période donnée : 'thisweek' (défaut),
// 'lastweek', 'nextweek', ou 'all' (les trois concaténés et triés).
async function getCalendar(range = 'thisweek') {
  return providers.getEvents(range);
}

// Retrouve un événement précis par son id sur l'ensemble des flux.
async function findEventById(id) {
  const all = await getCalendar('all');
  return all.find((e) => e.id === id) || null;
}

// Filtre utilitaire côté serveur (le front peut aussi filtrer).
function filterEvents(events, { currency, impact, country, country_name, event_type, from, to } = {}) {
  return events.filter((e) => {
    if (currency && e.currency !== currency.toUpperCase()) return false;
    if (country && e.country !== country.toUpperCase()) return false;
    if (country_name && e.country_name !== country_name) return false;
    if (event_type && e.event_type !== event_type) return false;
    if (impact && e.impact !== impact) return false;
    if (from && e.timestamp < new Date(from).getTime()) return false;
    if (to && e.timestamp > new Date(to).getTime()) return false;
    return true;
  });
}

module.exports = {
  getCalendar,
  findEventById,
  filterEvents,
  buildEventId: providers.buildEventId,
};
