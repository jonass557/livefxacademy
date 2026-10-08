const mongoose = require('mongoose');

// Cache persistant des traductions automatiques (partagé entre tous les utilisateurs).
// key = sha1(target + '|' + texte source) → évite de retraduire le même texte.
const translationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  target: { type: String, required: true },
  source_lang: { type: String, default: null },
  text: { type: String, required: true },
  translated: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

module.exports = mongoose.model('Translation', translationSchema);
