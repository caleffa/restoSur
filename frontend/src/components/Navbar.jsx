import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuItems = MENU_BY_ROLE[user?.role] || [];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="app-navbar">
      <div className="navbar-top-row">
        <div className="navbar-brand">RestoSur POS</div>
        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Abrir menú"
          aria-expanded={mobileMenuOpen}
        >
          ☰
        </button>
      </div>
      <nav className={`navbar-actions ${mobileMenuOpen ? 'is-open' : ''}`}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`touch-btn ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
        <button type="button" className="touch-btn btn-danger" onClick={logout}>
          Salir
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
