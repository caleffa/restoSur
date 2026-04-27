import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAppVersion } from '../config/version';

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    // evitar doble submit
    if (loading) return;

    setError('');
    setLoading(true);

    // validación básica
    if (!email || !password) {
      setError('Completa todos los campos');
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
        'No se pudo iniciar sesión'
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
        <h4>Ingreso al sistema</h4>

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
              <span className="spinner" /> Ingresando...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>
    </main>
  );
}

export default Login;