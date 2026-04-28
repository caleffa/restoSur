import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAppVersion } from '../config/version';
import { SUPPORTED_LANGUAGES, useLanguage } from '../context/LanguageContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const appVersion = getAppVersion();
  const { language, setLanguage, t } = useLanguage();

  const handleSubmit = async (event) => {
    event.preventDefault();

    // evitar doble submit
    if (loading) return;

    setError('');
    setLoading(true);

    // validación básica
    if (!email || !password) {
      setError(t('login.required_fields', 'Completa todos los campos'));
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        t('login.error_default', 'No se pudo iniciar sesión')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <img className="auth-logo" src="/icons/icon-512.svg" alt="RestoSur" />
        <h2><strong>RestoSur</strong></h2>
        <p className="system-version">Versión {appVersion}</p>
        <h4>{t('login.access', 'Ingreso al sistema')}</h4>

        <label htmlFor="login-language">{t('navbar.language', 'Idioma')}</label>
        <select
          id="login-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>{lang.toUpperCase()}</option>
          ))}
        </select>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          placeholder="usuario@restosur.com"
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="••••••••"
        />

        {error && <p className="error-text">{error}</p>}

        <button
          className="touch-btn btn-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" /> {t('login.loading', 'Ingresando...')}
            </>
          ) : (
            t('login.submit', 'Iniciar sesión')
          )}
        </button>
      </form>
    </main>
  );
}

export default Login;