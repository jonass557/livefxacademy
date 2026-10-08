const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Translation } = require('../models');

// Helper pour traduire un texte via Google Translate (fallback MyMemory)
async function fetchTranslation(text, target = 'en') {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();

  // 1. Google Translate API (gratuit, ultra rapide)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item) => item[0]).join('');
        if (translated && translated.trim()) {
          return translated;
        }
      }
    }
  } catch (err) {
    // console.warn('Google translate error:', err.message);
  }

  // 2. Fallback MyMemory
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 500))}&langpair=fr|${target}`;
    const mmRes = await fetch(mmUrl);
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      if (mmData?.responseData?.translatedText) {
        return mmData.responseData.translatedText;
      }
    }
  } catch (err) {
    // console.warn('MyMemory translate error:', err.message);
  }

  return trimmed;
}

// POST /api/translate
// Body: { texts: string[], target: 'en' }
router.post('/', async (req, res) => {
  try {
    const { texts, target = 'en' } = req.body || {};
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.json({ translations: {} });
    }

    // Filtrer et dédupliquer les textes non vides (max 50 par requête pour limiter la charge)
    const uniqueTexts = Array.from(new Set(texts.filter((t) => t && typeof t === 'string' && t.trim().length > 0))).slice(0, 50);

    const keysMap = new Map(); // key -> originalText
    uniqueTexts.forEach((t) => {
      const key = crypto.createHash('sha1').update(`${target}|${t.trim()}`).digest('hex');
      keysMap.set(key, t);
    });

    const keys = Array.from(keysMap.keys());
    const cachedDocs = await Translation.find({ key: { $in: keys } });

    const translations = {};
    const missingKeys = new Set(keys);

    cachedDocs.forEach((doc) => {
      const orig = keysMap.get(doc.key);
      if (orig) {
        translations[orig] = doc.translated;
        missingKeys.delete(doc.key);
      }
    });

    // Traduire les textes non encore en cache (en concurrence raisonnable)
    const toTranslate = Array.from(missingKeys).map((k) => ({
      key: k,
      text: keysMap.get(k),
    }));

    if (toTranslate.length > 0) {
      const results = await Promise.all(
        toTranslate.map(async ({ key, text }) => {
          const translated = await fetchTranslation(text, target);
          return { key, text, translated };
        })
      );

      // Enregistrer dans MongoDB de manière asynchrone
      for (const item of results) {
        translations[item.text] = item.translated;
        Translation.updateOne(
          { key: item.key },
          {
            $set: {
              key: item.key,
              target,
              text: item.text,
              translated: item.translated,
            },
          },
          { upsert: true }
        ).catch(() => {});
      }
    }

    res.json({ translations });
  } catch (err) {
    console.error('Translation error:', err.message);
    res.status(500).json({ message: 'Erreur de traduction', error: err.message });
  }
});

module.exports = router;
