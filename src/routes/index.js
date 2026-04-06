const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const salesRoutes = require('../modules/sales/sales.routes');
const cashRoutes = require('../modules/cash/cash.routes');
const productsRoutes = require('../modules/products/products.routes');
const categoriesRoutes = require('../modules/categories/categories.routes');
const usersRoutes = require('../modules/users/users.routes');
const stockRoutes = require('../modules/stock/stock.routes');
const kitchenRoutes = require('../modules/kitchen/kitchen.routes');
const afipRoutes = require('../modules/afip/afip.routes');
const invoicesRoutes = require('../modules/invoices/invoices.routes');
const tablesRoutes = require('../modules/tables/tables.routes');

const router = express.Router();

router.get('/health', (_req, res) => res.json({ ok: true, service: 'restosur-backend' }));

router.use('/auth', authRoutes);
router.use('/sales', salesRoutes);
router.use('/', cashRoutes);
router.use('/', productsRoutes);
router.use('/', categoriesRoutes);
router.use('/', usersRoutes);
router.use('/', stockRoutes);
router.use('/', kitchenRoutes);
router.use('/', afipRoutes);
router.use('/', invoicesRoutes);
router.use('/', tablesRoutes);

module.exports = router;
