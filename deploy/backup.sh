#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DB_PATH="${DATABASE_PATH:-/data/db/app.db}"
BACKUP_DIR="${BACKUP_DIR:-/data/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date -u +'%Y-%m-%dT%H-%M-%SZ')"
TMP="$BACKUP_DIR/.naregua-$STAMP.sqlite"
COMPRESSED="$BACKUP_DIR/.naregua-$STAMP.sqlite.gz"
OUT="$BACKUP_DIR/naregua-$STAMP.sqlite.gz.enc"

cleanup() { rm -f "$TMP" "$COMPRESSED"; }
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
test -f "$DB_PATH" || { echo "Banco não encontrado: $DB_PATH" >&2; exit 1; }
test -n "${BACKUP_ENCRYPTION_KEY:-}" || { echo 'BACKUP_ENCRYPTION_KEY é obrigatória para criar backups.' >&2; exit 1; }
sqlite3 "$DB_PATH" ".timeout 10000" ".backup '$TMP'"
test "$(sqlite3 "$TMP" 'PRAGMA quick_check;')" = 'ok' || { echo 'Backup inválido.' >&2; exit 1; }
gzip -9 -c "$TMP" > "$COMPRESSED"
node "$SCRIPT_DIR/backup-crypto.mjs" encrypt "$COMPRESSED" "$OUT"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256")
MEDIA_DIR="${WHATSAPP_MEDIA_DIR:-/data/media}"
if [ -d "$MEDIA_DIR" ]; then
  MEDIA_TMP="$BACKUP_DIR/.naregua-$STAMP.media.tar.gz"
  MEDIA_OUT="$BACKUP_DIR/naregua-$STAMP.media.tar.gz.enc"
  trap 'cleanup; rm -f "${MEDIA_TMP:-}"' EXIT
  tar -czf "$MEDIA_TMP" -C "$MEDIA_DIR" .
  node "$SCRIPT_DIR/backup-crypto.mjs" encrypt "$MEDIA_TMP" "$MEDIA_OUT"
  (cd "$BACKUP_DIR" && sha256sum "$(basename "$MEDIA_OUT")" > "$(basename "$MEDIA_OUT").sha256")
  rm -f "$MEDIA_TMP"
fi
find "$BACKUP_DIR" -type f \( -name 'naregua-*.media.tar.gz.enc*' -o -name 'naregua-*.sqlite.gz.enc' -o -name 'naregua-*.sqlite.gz.enc.sha256' -o -name 'naregua-*.sqlite.gz' -o -name 'naregua-*.sqlite.gz.sha256' \) -mtime "+$RETENTION_DAYS" -delete
printf 'Backup criptografado criado: %s\n' "$OUT"
