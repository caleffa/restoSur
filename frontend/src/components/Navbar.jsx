import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Table2,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';

const ICON_BY_PATH = {
  '/dashboard': LayoutDashboard,
  '/tables': Table2,
  '/admin/tables': Table2,
  '/admin/management/areas': Boxes,
  '/admin/management/users': Users,
  '/admin/management/categories': ClipboardList,
  '/admin/management/products': Package,
  '/cash/registers': Wallet,
  '/cash': CreditCard,
  '/cash/reports': BarChart3,
  '/admin/management/stock': Warehouse,
  '/sales/management': ShoppingCart,
  '/admin/management/invoices': Receipt,
  '/comandas': ChefHat,
};

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuItems = MENU_BY_ROLE[user?.role] || [];

  const currentSection = useMemo(() => {
    const active = menuItems.find((item) => item.path === location.pathname);
    return active?.label || 'Panel';
  }, [location.pathname, menuItems]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="app-navbar">
      <div className="navbar-top-row">
        <div>
          <p className="navbar-eyebrow">RestoSur POS</p>
          <p className="navbar-title">{currentSection}</p>
        </div>

        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Abrir menú"
          aria-expanded={mobileMenuOpen}
        >
          <Settings size={18} />
          Menú
        </button>
      </div>

      <nav className={`navbar-actions ${mobileMenuOpen ? 'is-open' : ''}`}>
        {menuItems.map((item) => {
          const Icon = ICON_BY_PATH[item.path] || LayoutDashboard;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`touch-btn ${location.pathname === item.path ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button type="button" className="touch-btn btn-danger" onClick={logout}>
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
