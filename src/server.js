const fs = require('fs');
const path = require('path');
const https = require('https');
const app = require('./app');
const { port, ssl } = require('./config/env');
const { testConnection } = require('./config/database');
const { ensureCashSchema } = require('./config/schemaBootstrap');
const { logInfo, logError } = require('./utils/logger');

const readSslCredential = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
};

(async () => {
  try {
    await testConnection();
    await ensureCashSchema();

    if (ssl.enabled) {
      const key = readSslCredential(ssl.keyPath);
      const cert = readSslCredential(ssl.certPath);

      https.createServer({ key, cert }, app).listen(port, () => {
        logInfo(`Servidor HTTPS levantado en https://localhost:${port}`);
      });
      return;
    }

    app.listen(port, () => logInfo(`Servidor HTTP levantado en http://localhost:${port}`));
  } catch (error) {
    logError('No se pudo iniciar servidor', { error: error.message });
    process.exit(1);
  }
})();
