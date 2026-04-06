const express = require('express');
const controller = require('./users.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

router.get('/users', controller.listUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

module.exports = router;
