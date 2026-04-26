#!/usr/bin/env bash
set -euo pipefail

# Deploy de backend Node.js usando SSH.
# Requiere en el VPS: Node.js 18+, npm, systemd y nginx (ya instalado).

usage() {
  cat <<'USAGE'
Uso:
  ./scripts/deploy/deploy-backend-vps.sh \
    --host TU_VPS \
    --user TU_USUARIO \
    --app-name restosur-backend \
    --remote-dir /var/www/restosur-backend \
    --service-port 3001 \
    --domain api.tudominio.com

Opciones:
  --host           Host/IP del VPS (requerido)
  --user           Usuario SSH del VPS (requerido)
  --app-name       Nombre del servicio systemd (default: restosur-backend)
  --remote-dir     Carpeta destino en VPS (default: /var/www/restosur-backend)
  --service-port   Puerto interno Node (default: 3001)
  --domain         Dominio/subdominio para nginx (requerido)
  --ssh-key        Ruta de clave SSH (opcional)
  --branch         Branch local a empaquetar (default: rama actual)
  --skip-db-schema No tocar schema.sql (solo backend)
  --help           Muestra esta ayuda

Notas:
- El script NO pisa el nginx de otras apps; crea un site dedicado.
- El puerto 3001 se usa por defecto para no chocar con otra app.
USAGE
}

HOST=""
USER=""
APP_NAME="restosur-backend"
REMOTE_DIR="/var/www/restosur-backend"
SERVICE_PORT="3001"
DOMAIN=""
SSH_KEY=""
BRANCH=""
SKIP_DB_SCHEMA="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="${2:-}"; shift 2 ;;
    --user) USER="${2:-}"; shift 2 ;;
    --app-name) APP_NAME="${2:-}"; shift 2 ;;
    --remote-dir) REMOTE_DIR="${2:-}"; shift 2 ;;
    --service-port) SERVICE_PORT="${2:-}"; shift 2 ;;
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --ssh-key) SSH_KEY="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --skip-db-schema) SKIP_DB_SCHEMA="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Opción no reconocida: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$HOST" || -z "$USER" || -z "$DOMAIN" ]]; then
  echo "Faltan parámetros requeridos (--host, --user, --domain)."
  usage
  exit 1
fi

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

SSH_OPTS=()
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=( -i "$SSH_KEY" )
fi

TMP_DIR="$(mktemp -d)"
ARCHIVE="$TMP_DIR/${APP_NAME}.tar.gz"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "[1/6] Generando paquete desde branch: $BRANCH"
git archive --format=tar.gz -o "$ARCHIVE" "$BRANCH"

echo "[2/6] Copiando paquete al VPS"
scp "${SSH_OPTS[@]}" "$ARCHIVE" "$USER@$HOST:/tmp/${APP_NAME}.tar.gz"

echo "[3/6] Instalando app en VPS"
ssh "${SSH_OPTS[@]}" "$USER@$HOST" bash <<REMOTE
set -euo pipefail
sudo mkdir -p "$REMOTE_DIR"
sudo tar -xzf "/tmp/${APP_NAME}.tar.gz" -C "$REMOTE_DIR"
sudo chown -R "$USER:$USER" "$REMOTE_DIR"
cd "$REMOTE_DIR"
npm ci --omit=dev
REMOTE

if [[ "$SKIP_DB_SCHEMA" == "false" ]]; then
  echo "[4/6] Copiando schema.sql al VPS (sin ejecutar)"
  scp "${SSH_OPTS[@]}" sql/schema.sql "$USER@$HOST:$REMOTE_DIR/sql-schema.sql"
else
  echo "[4/6] Omitido --skip-db-schema"
fi

echo "[5/6] Configurando systemd y nginx"
ssh "${SSH_OPTS[@]}" "$USER@$HOST" bash <<REMOTE
set -euo pipefail

sudo tee "/etc/systemd/system/${APP_NAME}.service" >/dev/null <<SERVICE
[Unit]
Description=${APP_NAME}
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REMOTE_DIR
Environment=NODE_ENV=production
Environment=PORT=$SERVICE_PORT
EnvironmentFile=-$REMOTE_DIR/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable "$APP_NAME"
sudo systemctl restart "$APP_NAME"

sudo tee "/etc/nginx/sites-available/${APP_NAME}.conf" >/dev/null <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$SERVICE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
NGINX

sudo ln -sfn "/etc/nginx/sites-available/${APP_NAME}.conf" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
sudo nginx -t
sudo systemctl reload nginx
REMOTE

echo "[6/6] Deploy finalizado ✅"
echo "Siguientes pasos:"
echo "- Subir un .env productivo a: $REMOTE_DIR/.env"
if [[ "$SKIP_DB_SCHEMA" == "false" ]]; then
  echo "- Ejecutar en VPS: mysql -u <user> -p <db_name> < $REMOTE_DIR/sql-schema.sql"
fi
echo "- (Opcional) TLS: sudo certbot --nginx -d $DOMAIN"
