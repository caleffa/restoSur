import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';
import { getAfipConfig } from '../services/adminService';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [activeParentPath, setActiveParentPath] = useState(null);
  const menuItems = MENU_BY_ROLE[user?.role] || [];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const matchedParent = menuItems.find(
      (item) => item.children?.some((child) => child.path === location.pathname),
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
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    // Asegurar que la ruta tenga el formato correcto
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${baseUrl}${cleanPath}`;
  };

  // Cargar la configuración AFIP para obtener el logo
  useEffect(() => {
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
  }, []);

  const visibleMenuItems = activeParentPath
    ? menuItems.find((item) => item.path === activeParentPath)?.children || []
    : menuItems;

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
                  console.log('Logo loaded successfully in navbar');
                  setLogoError(false);
                }}
              />
            </div>
          )}
          <div className="navbar-brand-text">RestoSur POS</div>
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
            className="touch-btn"
            onClick={() => setActiveParentPath(null)}
          >
            ← Volver
          </button>
        )}
        {visibleMenuItems.map((item) => (
          item.children ? (
            <Link
              key={item.path}
              to={item.path}
              className={`touch-btn ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setActiveParentPath(item.path)}
            >
              {item.label}
            </Link>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`touch-btn ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          )
        ))}
        <button type="button" className="touch-btn btn-danger" onClick={logout}>
          Salir
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
