const express = require('express');
const controller = require('./articleTypes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listArticleTypes);
router.post('', roleMiddleware('ADMIN'), controller.createArticleType);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateArticleType);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteArticleType);

module.exports = router;
