const express = require('express');
const controller = require('./comandas.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN', 'CAJERO', 'COCINA'));

router.get('/comandas', controller.listComandas);
router.get('/comandas/:id', controller.getComandaById);
router.post('/comandas', controller.createComanda);
router.patch('/comandas/:id/status', controller.updateComandaStatus);
router.delete('/comandas/:id', controller.deleteComanda);

module.exports = router;
