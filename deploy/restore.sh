#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 /caminho/backup.sqlite.gz.enc" >&2
  exit 1
fi

BACKUP="$(realpath "$1")"
DB_PATH="${DATABASE_PATH:-/opt/naregua/db_data/app.db}"
SERVICE_NAME="${SERVICE_NAME:-naregua}"
SERVICE_USER="${SERVICE_USER:-naregua}"
SERVICE_GROUP="${SERVICE_GROUP:-naregua}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP="$(mktemp --suffix=.sqlite)"
COMPRESSED="$(mktemp --suffix=.sqlite.gz)"
PREVIOUS="$DB_PATH.before-restore-$(date -u +%s)"
SERVICE_WAS_STOPPED=false
INSTALLED=false

cleanup() { rm -f "$TMP" "$COMPRESSED"; }
trap cleanup EXIT

rollback() {
  local status=$?
  if [[ "$INSTALLED" == true && -f "$PREVIOUS" ]]; then
    echo 'A restauração falhou; tentando voltar ao banco anterior.' >&2
    systemctl stop "$SERVICE_NAME" || true
    rm -f "$DB_PATH-wal" "$DB_PATH-shm"
    install -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 0640 "$PREVIOUS" "$DB_PATH"
    systemctl start "$SERVICE_NAME" || true
  elif [[ "$SERVICE_WAS_STOPPED" == true ]]; then
    systemctl start "$SERVICE_NAME" || true
  fi
  exit "$status"
}
trap rollback ERR

test -f "$BACKUP" || { echo "Backup não encontrado: $BACKUP" >&2; exit 1; }
if [[ -f "$BACKUP.sha256" ]]; then
  (cd "$(dirname "$BACKUP")" && sha256sum -c "$(basename "$BACKUP").sha256")
else
  echo 'Aviso: arquivo .sha256 não encontrado; a integridade criptográfica não pôde ser confirmada.' >&2
fi

if [[ "$BACKUP" == *.enc ]]; then
  test -n "${BACKUP_ENCRYPTION_KEY:-}" || { echo "BACKUP_ENCRYPTION_KEY é obrigatória para restaurar este backup." >&2; exit 1; }
  node "$SCRIPT_DIR/backup-crypto.mjs" decrypt "$BACKUP" "$COMPRESSED"
  gzip -dc "$COMPRESSED" > "$TMP"
else
  echo "Aviso: restaurando backup legado não criptografado." >&2
  gzip -dc "$BACKUP" > "$TMP"
fi
sqlite3 "$TMP" 'PRAGMA integrity_check;' | grep -qx ok || { echo 'Backup inválido: integrity_check falhou.' >&2; exit 1; }

systemctl stop "$SERVICE_NAME"
SERVICE_WAS_STOPPED=true
if [[ -f "$DB_PATH" ]]; then cp -a "$DB_PATH" "$PREVIOUS"; fi
rm -f "$DB_PATH-wal" "$DB_PATH-shm"
install -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 0640 "$TMP" "$DB_PATH"
INSTALLED=true

systemctl start "$SERVICE_NAME"
SERVICE_WAS_STOPPED=false
for _ in {1..20}; do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3000/api/ready >/dev/null; then
    trap - ERR
    echo "Restauração concluída e health check aprovado. Banco anterior preservado em: $PREVIOUS"
    exit 0
  fi
  sleep 1
done

echo 'O serviço não ficou pronto após a restauração.' >&2
false
