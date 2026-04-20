import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';
import { getAfipConfig } from '../services/adminService';
import  {  FaAngleLeft,FaArrowAltCircleLeft,FaPowerOff,FaReply,FaUser }  from  "react-icons/fa" ;


function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
        <button type="button" className="btn-label-2 touch-btn-danger-2" onClick={logout}>
          < FaPowerOff />
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
