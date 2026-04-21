const express = require('express');
const controller = require('./comandas.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('COCINA', 'ADMIN', 'CAJERO'));

router.get('', controller.listComandas);
router.get('/:id', controller.getComandaById);
router.post('', controller.createComanda);
router.patch('/:id/status', controller.updateComandaStatus);
router.delete('/:id', controller.deleteComanda);

module.exports = router;
