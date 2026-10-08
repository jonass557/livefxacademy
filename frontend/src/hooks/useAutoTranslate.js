import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translateTexts } from '../lib/translateService';

/**
 * Hook qui traduit automatiquement une liste de textes vers la langue active ('en' ou 'fr').
 * Supporte le français vers l'anglais et vice-versa.
 */
export function useAutoTranslate(texts = []) {
  const { language } = useLanguageStore();
  const currentLang = language === 'en' ? 'en' : 'fr';
  const isEn = currentLang === 'en';
  const [translations, setTranslations] = useState({});

  // Mémoïser la signature de la liste des textes pour éviter les requêtes inutiles
  const textArrayKey = useMemo(() => {
    return (texts || []).filter(Boolean).sort().join('|||');
  }, [texts]);

  useEffect(() => {
    if (!texts || texts.length === 0) return;

    let mounted = true;
    translateTexts(texts, currentLang).then((res) => {
      if (mounted && res) {
        setTranslations((prev) => ({ ...prev, ...res }));
      }
    });

    return () => {
      mounted = false;
    };
  }, [currentLang, textArrayKey]);

  const tr = useCallback((text) => {
    if (!text) return text;
    const trimmed = typeof text === 'string' ? text.trim() : '';
    return translations[trimmed] || text;
  }, [translations]);

  return { tr, isEn, language: currentLang, translations };
}
