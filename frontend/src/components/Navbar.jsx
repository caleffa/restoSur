import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';
import { getAfipConfig, getStock } from '../services/adminService';
import { FaBell, FaPowerOff, FaReply } from 'react-icons/fa';
import Modal from './Modal';
import { getRuntimeConfigValue } from '../config/runtimeConfig';
import { getAppVersion } from '../config/version';


function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [activeParentPath, setActiveParentPath] = useState(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const menuItems = MENU_BY_ROLE[user?.role] || [];
  const appVersion = getAppVersion();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const matchedParent = menuItems.find(
      (item) => (
        (item.children?.some((child) => child.path === location.pathname))
        || (item.children && item.path === location.pathname)
      ),
    );
    setActiveParentPath(matchedParent?.path || null);
  }, [location.pathname, menuItems]);

  // Función para construir URL completa de la imagen
  const getImageUrl = (path) => {
    if (!path) return null;
    
    // Si ya es una URL completa
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Si es data URL (base64)
    if (path.startsWith('data:')) {
      return path;
    }
    
    // Obtener la URL base del API
    const baseUrl = getRuntimeConfigValue('VITE_API_URL', import.meta.env.VITE_API_URL || 'https://localhost:3000/api').replace(/\/api\/?$/, '');
    
    // Asegurar que la ruta tenga el formato correcto
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${baseUrl}${cleanPath}`;
  };

  // Cargar la configuración AFIP para obtener el logo
  useEffect(() => {
    const canLoadAfipConfig = ['ADMIN', 'CAJERO'].includes(user?.role);
    if (!canLoadAfipConfig) return;

    const loadLogo = async () => {
      try {
        const config = await getAfipConfig();
        if (config && config.ticket_logo_path) {
          const url = getImageUrl(config.ticket_logo_path);
          setLogoUrl(url);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
        setLogoError(true);
      }
    };

    loadLogo();
  }, [user?.role]);

  useEffect(() => {
    let cancelled = false;

    const loadLowStockAlerts = async () => {
      try {
        const stockRows = await getStock();
        if (cancelled) return;

        const alerts = (Array.isArray(stockRows) ? stockRows : []).filter((item) => {
          const minimum = Number(item.stock_minimum);
          const quantity = Number(item.quantity);
          const managesStock = item.manages_stock === 1 || item.manages_stock === true;
          return managesStock && Number.isFinite(minimum) && minimum > 0 && quantity <= minimum;
        });

        setLowStockCount(alerts.length);
        setLowStockAlerts(
          alerts.map((item) => {
            const name = item.name || item.article_name || 'Artículo sin nombre';
            const quantity = Number(item.quantity);
            const minimum = Number(item.stock_minimum);
            return `${name}: stock actual ${Number.isFinite(quantity) ? quantity : 0}, mínimo ${Number.isFinite(minimum) ? minimum : 0}`;
          }),
        );
      } catch {
        if (!cancelled) {
          setLowStockCount(0);
          setLowStockAlerts([]);
        }
      }
    };

    loadLowStockAlerts();
    const intervalId = setInterval(loadLowStockAlerts, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const visibleMenuItems = activeParentPath
    ? menuItems.find((item) => item.path === activeParentPath)?.children || []
    : menuItems;

  const handleParentMenuClick = (item) => {
    setActiveParentPath(item.path);
    navigate(item.path);
  };

  return (
    <header className="app-navbar">
      <div className="navbar-top-row">
        <div className="navbar-brand">
          {/* Logo encima del nombre */}
          {logoUrl && !logoError && (
            <div className="navbar-logo-container">
              <img
                src={logoUrl}
                alt="Logo RestoSur"
                className="navbar-logo"
                onError={(e) => {
                  console.error('Error loading logo in navbar:', logoUrl);
                  setLogoError(true);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  // console.log('Logo loaded successfully in navbar');
                  setLogoError(false);
                }}
              />
            </div>
          )}
          <div className="navbar-brand-text">RestoPOS</div>
          <div className="navbar-brand-version">{appVersion}</div>
        </div>
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
        {activeParentPath && (
          <button
            type="button"
            className="btn-label-2 touch-btn-back-2"
            onClick={() => setActiveParentPath(null)}
          >
            <FaReply />
          </button>
        )}
        {visibleMenuItems.map((item) => 
          (
          item.children ? (
            <button
              key={item.path}
              type="button"
              className={`btn-label-2 touch-btn-2 ${activeParentPath === item.path ? 'active' : ''}`}
              onClick={() => handleParentMenuClick(item)}
            >
              <span>{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`btn-label-2 touch-btn-2 ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span>{item.label}</span>
            </Link>
          )
        ))}
        <button
          type="button"
          className={`btn-label-2 touch-btn-2 navbar-bell-btn ${lowStockCount > 0 ? 'has-alert' : ''}`}
          onClick={() => setShowAlertsModal(true)}
          title={lowStockCount > 0 ? `Hay ${lowStockCount} artículo(s) en stock mínimo` : 'Sin alertas de stock mínimo'}
        >
          <FaBell />
          {lowStockCount > 0 ? <span className="navbar-alert-badge">{lowStockCount}</span> : null}
        </button>
        <button type="button" className="btn-label-2 touch-btn-danger-2" onClick={logout}>
          <FaPowerOff />
        </button>
      </nav>
      {showAlertsModal && (
        <Modal
          title="Alertas"
          onClose={() => setShowAlertsModal(false)}
          actions={(
            <button type="button" className="touch-btn-danger" onClick={() => setShowAlertsModal(false)}>
              Cerrar
            </button>
          )}
        >
          {lowStockAlerts.length > 0 ? (
            <ul className="alerts-list">
              {lowStockAlerts.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          ) : (
            <p>No hay mensajes de alerta.</p>
          )}
        </Modal>
      )}
    </header>
  );
}

export default Navbar;
