const express = require('express');
const controller = require('./tables.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.get('/tables', controller.list);
router.post('/tables', roleMiddleware('ADMIN', 'CAJERO'), controller.create);
router.put('/tables/:id', roleMiddleware('ADMIN', 'CAJERO'), controller.update);
router.delete('/tables/:id', roleMiddleware('ADMIN'), controller.remove);

module.exports = router;
