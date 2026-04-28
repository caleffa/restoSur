const systemTextsService = require('./systemTexts.service');

async function listSystemTexts(req, res) {
  const language = String(req.query.lang || 'es').toLowerCase();
  const data = await systemTextsService.listByLanguage(language);
  res.json({ language, data });
}

module.exports = {
  listSystemTexts,
};
