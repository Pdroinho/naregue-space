#!/usr/bin/env sh
set -eu
umask 077

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 /backups/arquivo.sqlite.gz.enc" >&2
  exit 1
fi

BACKUP="$1"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DB_PATH="${DATABASE_PATH:-/data/db/app.db}"
DB_DIR="$(dirname "$DB_PATH")"
STAMP="$(date -u +'%Y-%m-%dT%H-%M-%SZ')"
PREVIOUS="$DB_PATH.before-restore-$STAMP"
TMP="$DB_DIR/.restore-$STAMP.sqlite"
COMPRESSED="$DB_DIR/.restore-$STAMP.sqlite.gz"

cleanup() { rm -f "$TMP" "$COMPRESSED"; }
trap cleanup EXIT INT TERM

test -f "$BACKUP" || { echo "Backup não encontrado: $BACKUP" >&2; exit 1; }
mkdir -p "$DB_DIR"

if [ -f "$BACKUP.sha256" ]; then
  (cd "$(dirname "$BACKUP")" && sha256sum -c "$(basename "$BACKUP").sha256")
else
  echo "Aviso: $BACKUP.sha256 não existe; o integrity_check ainda será executado." >&2
fi

case "$BACKUP" in
  *.enc)
    [ -n "${BACKUP_ENCRYPTION_KEY:-}" ] || { echo "BACKUP_ENCRYPTION_KEY é obrigatória para restaurar este backup." >&2; exit 1; }
    node "$SCRIPT_DIR/backup-crypto.mjs" decrypt "$BACKUP" "$COMPRESSED"
    gzip -dc "$COMPRESSED" > "$TMP"
    ;;
  *)
    echo "Aviso: restaurando backup legado não criptografado." >&2
    gzip -dc "$BACKUP" > "$TMP"
    ;;
esac
[ "$(sqlite3 "$TMP" 'PRAGMA integrity_check;')" = "ok" ] || { echo 'Backup inválido: integrity_check falhou.' >&2; exit 1; }

if [ -f "$DB_PATH" ]; then cp -p "$DB_PATH" "$PREVIOUS"; fi
rm -f "$DB_PATH-wal" "$DB_PATH-shm"
mv "$TMP" "$DB_PATH"
chmod 600 "$DB_PATH"
trap - EXIT INT TERM
printf 'Banco restaurado. Cópia anterior: %s\n' "$PREVIOUS"
