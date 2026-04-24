const dotenv = require('dotenv');
dotenv.config();

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  ssl: {
    enabled: parseBoolean(process.env.HTTPS_ENABLED, true),
    keyPath: process.env.SSL_KEY_PATH || 'certs/localhost-key.pem',
    certPath: process.env.SSL_CERT_PATH || 'certs/localhost.pem',
  },
};
