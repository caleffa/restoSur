const express = require('express');
const controller = require('./users.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

router.get('', controller.listUsers);
router.post('', controller.createUser);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
