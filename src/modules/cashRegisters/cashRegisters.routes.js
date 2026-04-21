const express = require('express');
const controller = require('./cashRegisters.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router(); 
router.use(authMiddleware);

router.get('', roleMiddleware('ADMIN', 'CAJERO'), controller.listRegisters);
router.post('', roleMiddleware('ADMIN'), controller.createRegister);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateRegister);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteRegister);


module.exports = router;
