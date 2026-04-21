const express = require('express');
const controller = require('./customers.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listCustomers);
router.post('', roleMiddleware('ADMIN'), controller.createCustomer);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateCustomer);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteCustomer);

module.exports = router;
