import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuItems = MENU_BY_ROLE[user?.role] || [];

  return (
    <header className="app-navbar">
      <div className="navbar-brand">RestoSur POS</div>
      <nav className="navbar-actions">
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
