const express = require('express');
const controller = require('./customers.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/customers', controller.listCustomers);
router.post('/customers', roleMiddleware('ADMIN'), controller.createCustomer);
router.put('/customers/:id', roleMiddleware('ADMIN'), controller.updateCustomer);
router.delete('/customers/:id', roleMiddleware('ADMIN'), controller.deleteCustomer);

module.exports = router;
