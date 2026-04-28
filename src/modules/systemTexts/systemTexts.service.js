const systemTextsRepository = require('./systemTexts.repository');

async function listByLanguage(language) {
  const rows = await systemTextsRepository.listByLanguage(language);

  return rows.reduce((acc, row) => {
    acc[row.reference_key] = {
      title: row.title,
      message: row.message,
    };
    return acc;
  }, {});
}

module.exports = {
  listByLanguage,
};
