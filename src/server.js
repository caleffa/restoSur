const app = require('./app');
const { port } = require('./config/env');
const { testConnection } = require('./config/database');
const { logInfo, logError } = require('./utils/logger');

(async () => {
  try {
    await testConnection();
    app.listen(port, () => logInfo(`Servidor levantado en puerto ${port}`));
  } catch (error) {
    logError('No se pudo iniciar servidor', { error: error.message });
    process.exit(1);
  }
})();
