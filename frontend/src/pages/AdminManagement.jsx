import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const ADMIN_MODULES = [
  {
    title: 'Áreas',
    description: 'Alta, edición y baja de áreas para agrupar mesas.',
    path: '/admin/management/areas',
  },
  {
    title: 'Mapa de salón',
    description: 'Diseño visual de mesas por área con drag & drop.',
    path: '/admin/management/areas-map',
  },
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
    title: 'Recetas',
    description: 'Definición de insumos por producto con cantidades y fracciones según unidad.',
    path: '/admin/management/recipes',
  },
  {
    title: 'Tipos de cocina',
    description: 'Alta, edición y baja de tipos para organizar cocinas.',
    path: '/admin/management/kitchen-types',
  },
  {
    title: 'Cocinas',
    description: 'Gestión de cocinas operativas con filtros por tipo y estado.',
    path: '/admin/management/kitchens',
  },


  {
    title: 'Tipos de artículos',
    description: 'Alta, edición y baja de tipos para clasificar artículos de stock.',
    path: '/admin/management/article-types',
  },
  {
    title: 'Unidades de medida',
    description: 'Gestión de unidades y códigos para artículos de inventario.',
    path: '/admin/management/measurement-units',
  },
  {
    title: 'Artículos',
    description: 'Administración de artículos con tipo, unidad, costo y estado.',
    path: '/admin/management/articles',
  },

  {
    title: 'Stock',
    description: 'Control de existencias y carga de movimientos de inventario.',
    path: '/admin/management/stock',
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
