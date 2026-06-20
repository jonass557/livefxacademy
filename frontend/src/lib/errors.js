// Extrait un message d'erreur lisible à partir d'une erreur axios.
// Priorité : message renvoyé par le serveur > cas réseau/timeout > fallback.
// `t` est la fonction de traduction du languageStore.
export const getErrorMessage = (error, t) => {
  // Timeout (le serveur met trop de temps, ex: cold-start Render)
  if (error?.code === 'ECONNABORTED') {
    return t('common.timeoutError');
  }

  // Pas de réponse du tout = problème réseau / serveur injoignable
  if (error?.message === 'Network Error' || !error?.response) {
    return t('common.networkError');
  }

  const raw = error.response?.data?.message || error.response?.data?.error;

  // Traduction des messages backend connus (renvoyés en anglais)
  const map = {
    'Invalid credentials': t('login.invalidCredentials'),
    'User already exists': t('register.userExists'),
  };

  return map[raw] || raw || t('common.unknownError');
};
