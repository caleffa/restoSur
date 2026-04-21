const express = require('express');
const controller = require('./articles.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/articles', controller.listArticles);
router.get('/articles/import/template', roleMiddleware('ADMIN'), controller.downloadImportTemplate);
router.get('/articles/:id', controller.getArticleById);
router.post('/articles', roleMiddleware('ADMIN'), controller.createArticle);
router.post('/articles/import', roleMiddleware('ADMIN'), controller.importArticlesFromCsv);
router.put('/articles/:id', roleMiddleware('ADMIN'), controller.updateArticle);
router.delete('/articles/:id', roleMiddleware('ADMIN'), controller.deleteArticle);

module.exports = router;
