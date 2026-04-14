export const ROLES = {
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  MOZO: 'MOZO',
  COCINA: 'COCINA',
};

export const MENU_BY_ROLE = {
  [ROLES.ADMIN]: [
    { label: 'Dashboard', path: '/dashboard' },
    {
      label: 'Mesas',
      path: '/admin/tables',
      children: [
        { label: 'Mesas', path: '/admin/tables' },
        { label: 'Áreas', path: '/admin/management/areas' },
        { label: 'Mapa salón', path: '/admin/management/areas-map' },
      ],
    },
    {
      label: 'Artículos',
      path: '/admin/management/articles',
      children: [
        { label: 'Tipos de artículos', path: '/admin/management/article-types' },
        { label: 'Unidades de medida', path: '/admin/management/measurement-units' },
      ],
    },
    { label: 'Stock', path: '/admin/management/stock' },
    {
      label: 'Productos',
      path: '/admin/management/products',
      children: [
        { label: 'Recetas', path: '/admin/management/recipes' },
      ],
    },
    {
      label: 'Caja',
      path: '/cash',
      children: [
        { label: 'Admin cajas', path: '/cash/registers' },
      ],
    },
    {
      label: 'Ventas',
      path: '/sales/management',
      children: [
        { label: 'Facturación', path: '/admin/management/invoices' },
      ],
    },
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
