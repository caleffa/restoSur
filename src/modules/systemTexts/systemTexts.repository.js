const { query } = require('../../repositories/baseRepository');

const SUPPORTED_LANGS = ['es', 'en', 'pt'];

async function listByLanguage(language = 'es') {
  const lang = SUPPORTED_LANGS.includes(language) ? language : 'es';
  return query(
    `SELECT reference_key, title, message
     FROM system_texts
     WHERE language_code = ?`,
    [lang]
  );
}

module.exports = {
  listByLanguage,
};
