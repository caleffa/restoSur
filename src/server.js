const app = require('./app');
const { port } = require('./config/env');
const { testConnection } = require('./config/database');
const { ensureCashSchema } = require('./config/schemaBootstrap');
const { logInfo, logError } = require('./utils/logger');

(async () => {
  try {
    await testConnection();
    await ensureCashSchema();
    app.listen(port, () => logInfo(`Servidor levantado en puerto ${port}`));
  } catch (error) {
    logError('No se pudo iniciar servidor', { error: error.message });
    process.exit(1);
  }
})();
