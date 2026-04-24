import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const resolveIfExists = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
};

const keyPath = resolveIfExists(process.env.VITE_SSL_KEY_PATH || '../certs/localhost-key.pem');
const certPath = resolveIfExists(process.env.VITE_SSL_CERT_PATH || '../certs/localhost.pem');

const httpsConfig = keyPath && certPath
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  : true;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    cors: true,
    https: httpsConfig,
  },
});
