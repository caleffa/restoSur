import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import POS from '../pages/POS';
import Tables from '../pages/Tables';
import TableAdmin from '../pages/TableAdmin';
import AdminManagement from '../pages/AdminManagement';
import AdminUsers from '../pages/AdminUsers';
import AdminCategories from '../pages/AdminCategories';
import AdminProducts from '../pages/AdminProducts';
import { ROLES } from '../utils/roles';

function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO, ROLES.MOZO, ROLES.COCINA]}>
            <Dashboard />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/tables"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO, ROLES.MOZO]}>
            <Tables />
          </ProtectedRoute>
        )}
      />


      <Route
        path="/admin/tables"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <TableAdmin />
          </ProtectedRoute>
        )}
      />


      <Route
        path="/admin/management"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminManagement />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/users"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminUsers />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/categories"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminCategories />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/products"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminProducts />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/pos/:tableId"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO, ROLES.MOZO]}>
            <POS />
          </ProtectedRoute>
        )}
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRouter;
