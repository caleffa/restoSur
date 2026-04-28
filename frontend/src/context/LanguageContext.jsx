import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSystemTexts } from '../services/systemTextService';

const LanguageContext = createContext(null);

const SUPPORTED_LANGUAGES = ['es', 'en', 'pt'];
const STORAGE_KEY = 'restosur_language';

const FALLBACK_TEXTS = {
  'navbar.open_menu': { title: 'Menú', message: 'Abrir menú', es: 'Abrir menú', en: 'Open menu', pt: 'Abrir menu' },
  'navbar.alerts_title': { title: 'Alertas', message: 'Alertas', es: 'Alertas', en: 'Alerts', pt: 'Alertas' },
  'navbar.close': { title: 'Cerrar', message: 'Cerrar', es: 'Cerrar', en: 'Close', pt: 'Fechar' },
  'navbar.no_alerts': { title: 'Sin alertas', message: 'No hay mensajes de alerta.', es: 'No hay mensajes de alerta.', en: 'No alert messages.', pt: 'Sem mensagens de alerta.' },
  'navbar.language': { title: 'Idioma', message: 'Idioma', es: 'Idioma', en: 'Language', pt: 'Idioma' },
  'login.access': { title: 'Ingreso al sistema', message: 'Ingreso al sistema', es: 'Ingreso al sistema', en: 'System login', pt: 'Acesso ao sistema' },
  'login.submit': { title: 'Iniciar sesión', message: 'Iniciar sesión', es: 'Iniciar sesión', en: 'Sign in', pt: 'Entrar' },
  'login.loading': { title: 'Ingresando...', message: 'Ingresando...', es: 'Ingresando...', en: 'Signing in...', pt: 'Entrando...' },
  'login.required_fields': { title: 'Completa todos los campos', message: 'Completa todos los campos', es: 'Completa todos los campos', en: 'Complete all fields', pt: 'Preencha todos os campos' },
  'login.error_default': { title: 'No se pudo iniciar sesión', message: 'No se pudo iniciar sesión', es: 'No se pudo iniciar sesión', en: 'Could not sign in', pt: 'Não foi possível entrar' },
};

function resolveLanguageValue(entry, language, fallback) {
  if (!entry) return fallback;
  return entry[language] || entry.message || entry.title || fallback;
}

function normalizeReference(text = '') {
  return String(text)
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^a-z0-9_]/g, '');
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || 'es';
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : 'es';
  });
  const [remoteTexts, setRemoteTexts] = useState({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    const loadTexts = async () => {
      try {
        const data = await getSystemTexts(language);
        if (!cancelled) {
          setRemoteTexts(data);
        }
      } catch {
        if (!cancelled) {
          setRemoteTexts({});
        }
      }
    };

    loadTexts();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (reference, fallback = '') => {
      const remoteEntry = remoteTexts[reference];
      if (remoteEntry) {
        return resolveLanguageValue(remoteEntry, language, fallback);
      }

      const localEntry = FALLBACK_TEXTS[reference];
      return resolveLanguageValue(localEntry, language, fallback);
    },
    td: (defaultText = '', reference = '') => {
      const referenceCandidates = [
        reference,
        defaultText,
        `ui.${normalizeReference(defaultText)}`,
      ].filter(Boolean);

      for (const key of referenceCandidates) {
        const remoteEntry = remoteTexts[key];
        if (remoteEntry) {
          return resolveLanguageValue(remoteEntry, language, defaultText);
        }

        const localEntry = FALLBACK_TEXTS[key];
        if (localEntry) {
          return resolveLanguageValue(localEntry, language, defaultText);
        }
      }

      return defaultText;
    },
  }), [language, remoteTexts]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export { SUPPORTED_LANGUAGES };
