const express = require('express');
const controller = require('./articleTypes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/article-types', controller.listArticleTypes);
router.post('/article-types', roleMiddleware('ADMIN'), controller.createArticleType);
router.put('/article-types/:id', roleMiddleware('ADMIN'), controller.updateArticleType);
router.delete('/article-types/:id', roleMiddleware('ADMIN'), controller.deleteArticleType);

module.exports = router;
