export const ROLES = {
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  MOZO: 'MOZO',
  COCINA: 'COCINA',
};

export const MENU_BY_ROLE = {
  [ROLES.ADMIN]: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Mesas', path: '/tables' },
    { label: 'Admin Mesas', path: '/admin/tables' },
    { label: 'Áreas', path: '/admin/management/areas' },
    { label: 'Admin Usuarios', path: '/admin/management/users' },
    { label: 'Admin Categorías', path: '/admin/management/categories' },
    { label: 'Admin Productos', path: '/admin/management/products' },
    { label: 'Admin Recetas', path: '/admin/management/recipes' },
    { label: 'Admin Tipos de Artículos', path: '/admin/management/article-types' },
    { label: 'Admin Unidades de Medida', path: '/admin/management/measurement-units' },
    { label: 'Admin Artículos', path: '/admin/management/articles' },
    { label: 'Cajas', path: '/cash/registers' },
    { label: 'Caja', path: '/cash' },
    { label: 'Reportes Caja', path: '/cash/reports' },
    { label: 'Stock', path: '/admin/management/stock' },
    { label: 'Ventas', path: '/sales/management' },
    { label: 'Facturación', path: '/admin/management/invoices' },
    { label: 'Comandas', path: '/comandas' },
  ],
  [ROLES.CAJERO]: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Mesas', path: '/tables' },
    { label: 'Caja', path: '/cash' },
    { label: 'Reportes Caja', path: '/cash/reports' },
    { label: 'Stock', path: '/admin/management/stock' },
    { label: 'Ventas', path: '/sales/management' },
    { label: 'Facturación', path: '/admin/management/invoices' },
    { label: 'Comandas', path: '/comandas' },
  ],
  [ROLES.MOZO]: [
    { label: 'Mesas', path: '/tables' },
  ],
  [ROLES.COCINA]: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Comandas', path: '/comandas' },
  ],
};

export function hasRequiredRole(userRole, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  return allowedRoles.includes(userRole);
}

export function canCreateSale(role) {
  return [ROLES.ADMIN, ROLES.CAJERO, ROLES.MOZO].includes(role);
}

export function canAccessPOS(role) {
  return [ROLES.ADMIN, ROLES.CAJERO, ROLES.MOZO].includes(role);
}
