const express = require('express');
const controller = require('./articles.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listArticles);
router.get('/import/template', roleMiddleware('ADMIN'), controller.downloadImportTemplate);
router.get('/:id', controller.getArticleById);
router.post('', roleMiddleware('ADMIN'), controller.createArticle);
router.post('/import', roleMiddleware('ADMIN'), controller.importArticlesFromCsv);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateArticle);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteArticle);

module.exports = router;
