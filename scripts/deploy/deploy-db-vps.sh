#!/usr/bin/env bash
set -euo pipefail

# Inicializa o actualiza esquema MySQL en VPS remoto.

usage() {
  cat <<'USAGE'
Uso:
  ./scripts/deploy/deploy-db-vps.sh \
    --host TU_VPS \
    --user TU_USUARIO \
    --db-host 127.0.0.1 \
    --db-port 3306 \
    --db-name restosur \
    --db-user app_user

Opciones:
  --host         Host/IP del VPS (requerido)
  --user         Usuario SSH del VPS (requerido)
  --db-host      Host MySQL (default: 127.0.0.1)
  --db-port      Puerto MySQL (default: 3306)
  --db-name      Nombre de base (requerido)
  --db-user      Usuario MySQL (requerido)
  --schema       Ruta local del schema (default: sql/schema.sql)
  --ssh-key      Ruta de clave SSH (opcional)
  --help         Muestra esta ayuda

Notas:
- Pide password de MySQL de forma interactiva en el VPS (no la guarda).
- Crea la base de datos si no existe.
USAGE
}

HOST=""
USER=""
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME=""
DB_USER=""
SCHEMA_PATH="sql/schema.sql"
SSH_KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="${2:-}"; shift 2 ;;
    --user) USER="${2:-}"; shift 2 ;;
    --db-host) DB_HOST="${2:-}"; shift 2 ;;
    --db-port) DB_PORT="${2:-}"; shift 2 ;;
    --db-name) DB_NAME="${2:-}"; shift 2 ;;
    --db-user) DB_USER="${2:-}"; shift 2 ;;
    --schema) SCHEMA_PATH="${2:-}"; shift 2 ;;
    --ssh-key) SSH_KEY="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Opción no reconocida: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$HOST" || -z "$USER" || -z "$DB_NAME" || -z "$DB_USER" ]]; then
  echo "Faltan parámetros requeridos (--host, --user, --db-name, --db-user)."
  usage
  exit 1
fi

if [[ ! -f "$SCHEMA_PATH" ]]; then
  echo "No existe schema: $SCHEMA_PATH"
  exit 1
fi

SSH_OPTS=()
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=( -i "$SSH_KEY" )
fi

REMOTE_SCHEMA="/tmp/${DB_NAME}-schema.sql"

echo "[1/3] Copiando schema al VPS"
scp "${SSH_OPTS[@]}" "$SCHEMA_PATH" "$USER@$HOST:$REMOTE_SCHEMA"

echo "[2/3] Creando base de datos si no existe"
ssh -t "${SSH_OPTS[@]}" "$USER@$HOST" "mysql -h '$DB_HOST' -P '$DB_PORT' -u '$DB_USER' -p -e \"CREATE DATABASE IF NOT EXISTS \\\`$DB_NAME\\\`;\""

echo "[3/3] Importando schema"
ssh -t "${SSH_OPTS[@]}" "$USER@$HOST" "mysql -h '$DB_HOST' -P '$DB_PORT' -u '$DB_USER' -p '$DB_NAME' < '$REMOTE_SCHEMA'"

echo "Deploy de DB finalizado ✅"
