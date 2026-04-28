import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import POS from '../pages/POS';
import Tables from '../pages/Tables';
import TableAdmin from '../pages/TableAdmin';
import AdminAreas from '../pages/AdminAreas';
import AdminAreaMapEditor from '../pages/AdminAreaMapEditor';
import AdminManagement from '../pages/AdminManagement';
import AdminUsers from '../pages/AdminUsers';
import AdminCategories from '../pages/AdminCategories';
import AdminProducts from '../pages/AdminProducts';
import AdminStock from '../pages/AdminStock';
import AdminArticleTypes from '../pages/AdminArticleTypes';
import AdminMeasurementUnits from '../pages/AdminMeasurementUnits';
import AdminArticles from '../pages/AdminArticles';
import CashRegisters from '../pages/CashRegisters';
import Cash from '../pages/Cash';
import CashReport from '../pages/CashReport';
import Comandas from '../pages/Comandas';
import SalesManagement from '../pages/SalesManagement';
import AdminSalesReport from '../pages/AdminSalesReport';
import AdminProfitReport from '../pages/AdminProfitReport';
import AdminInvoices from '../pages/AdminInvoices';
import AdminRecipes from '../pages/AdminRecipes';
import AdminKitchenTypes from '../pages/AdminKitchenTypes';
import AdminKitchens from '../pages/AdminKitchens';
import AdminCashReasons from '../pages/AdminCashReasons';
import AdminPaymentMethods from '../pages/AdminPaymentMethods';
import AdminVatTypes from '../pages/AdminVatTypes';
import AdminSuppliers from '../pages/AdminSuppliers';
import AdminCustomers from '../pages/AdminCustomers';
import AdminPurchaseOrders from '../pages/AdminPurchaseOrders';
import PurchaseOrderReception from '../pages/PurchaseOrderReception';
import HelpManual from '../pages/HelpManual';
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
        path="/admin/management/areas"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminAreas />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/areas-map"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminAreaMapEditor />
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
        path="/admin/management/recipes"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.COCINA]}>
            <AdminRecipes />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/kitchen-types"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminKitchenTypes />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/kitchens"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminKitchens />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/products"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.COCINA]}>
            <AdminProducts />
          </ProtectedRoute>
        )}
      />


      <Route
        path="/admin/management/article-types"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminArticleTypes />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/measurement-units"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminMeasurementUnits />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/articles"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminArticles />
          </ProtectedRoute>
        )}
      />



      <Route
        path="/admin/management/payment-methods"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <AdminPaymentMethods />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/cash-reasons"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminCashReasons />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/vat-types"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminVatTypes />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/suppliers"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminSuppliers />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/customers"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminCustomers />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/purchase-orders"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminPurchaseOrders />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/purchase-orders/reception"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <PurchaseOrderReception />
          </ProtectedRoute>
        )}
      />


      <Route
        path="/admin/management/stock"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <AdminStock />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/management/invoices"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <AdminInvoices />
          </ProtectedRoute>
        )}
      />


      <Route
        path="/cash/registers"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <CashRegisters />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/cash"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <Cash />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/cash/reports"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <CashReport />
          </ProtectedRoute>
        )}
      />


      <Route
        path="/comandas"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO, ROLES.COCINA]}>
            <Comandas />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/sales/management"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <SalesManagement />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/reports/sales"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminSalesReport />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin/reports/profits"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO]}>
            <AdminProfitReport />
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

      <Route
        path="/help"
        element={(
          <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CAJERO, ROLES.MOZO, ROLES.COCINA]}>
            <HelpManual />
          </ProtectedRoute>
        )}
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRouter;
