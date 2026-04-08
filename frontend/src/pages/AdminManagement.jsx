import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const ADMIN_MODULES = [
  {
    title: 'Usuarios',
    description: 'Alta, edición y baja de usuarios del sistema.',
    path: '/admin/management/users',
  },
  {
    title: 'Categorías',
    description: 'Administración de categorías para agrupar productos.',
    path: '/admin/management/categories',
  },
  {
    title: 'Productos',
    description: 'Gestión del catálogo de productos y su estado.',
    path: '/admin/management/products',
  },
  {
    title: 'Ventas',
    description: 'Reportes de ventas con filtros por fecha, estado y método de pago.',
    path: '/sales/management',
  },
  {
    title: 'Facturación AFIP',
    description: 'Configuración AFIP, CAEA y emisión/consulta de facturas.',
    path: '/admin/management/invoices',
  },
];

function AdminManagement() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Panel de administración</h2>
        <p>Seleccioná un módulo para gestionarlo en su pantalla dedicada.</p>

        <section className="admin-grid">
          {ADMIN_MODULES.map((module) => (
            <article key={module.path} className="admin-card">
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <Link className="touch-btn btn-primary" to={module.path}>
                Ir a {module.title}
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default AdminManagement;
