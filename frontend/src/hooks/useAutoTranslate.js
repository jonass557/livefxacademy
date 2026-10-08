import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translateTexts } from '../lib/translateService';

/**
 * Hook qui traduit automatiquement une liste de textes vers la langue active (si 'en').
 * Met à disposition une fonction `tr(text)` pour afficher le texte traduit ou d'origine.
 */
export function useAutoTranslate(texts = []) {
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  const [translations, setTranslations] = useState({});

  // Mémoïser la liste des textes pour éviter les requêtes inutiles
  const textArrayKey = useMemo(() => {
    return (texts || []).filter(Boolean).sort().join('|||');
  }, [texts]);

  useEffect(() => {
    if (!isEn || !texts || texts.length === 0) return;

    let mounted = true;
    translateTexts(texts, 'en').then((res) => {
      if (mounted && res) {
        setTranslations((prev) => ({ ...prev, ...res }));
      }
    });

    return () => {
      mounted = false;
    };
  }, [isEn, textArrayKey]);

  const tr = useCallback((text) => {
    if (!text || !isEn) return text;
    const trimmed = typeof text === 'string' ? text.trim() : '';
    return translations[trimmed] || text;
  }, [isEn, translations]);

  return { tr, isEn, translations };
}
