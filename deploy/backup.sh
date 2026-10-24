#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DB_PATH="${DATABASE_PATH:-/opt/naregua/db_data/app.db}"
BACKUP_DIR="${BACKUP_DIR:-/opt/naregua/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date -u +'%Y-%m-%dT%H-%M-%SZ')"
TMP="$BACKUP_DIR/.naregua-$STAMP.sqlite"
COMPRESSED="$BACKUP_DIR/.naregua-$STAMP.sqlite.gz"
OUT="$BACKUP_DIR/naregua-$STAMP.sqlite.gz.enc"

cleanup() { rm -f "$TMP" "$COMPRESSED"; }
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"
test -f "$DB_PATH" || { echo "Banco não encontrado: $DB_PATH" >&2; exit 1; }
test -n "${BACKUP_ENCRYPTION_KEY:-}" || { echo 'BACKUP_ENCRYPTION_KEY é obrigatória para criar backups.' >&2; exit 1; }
sqlite3 "$DB_PATH" ".timeout 10000" ".backup '$TMP'"
gzip -9 -c "$TMP" > "$COMPRESSED"
node "$SCRIPT_DIR/backup-crypto.mjs" encrypt "$COMPRESSED" "$OUT"
sha256sum "$OUT" > "$OUT.sha256"
find "$BACKUP_DIR" -type f \( -name 'naregua-*.sqlite.gz.enc' -o -name 'naregua-*.sqlite.gz.enc.sha256' -o -name 'naregua-*.sqlite.gz' -o -name 'naregua-*.sqlite.gz.sha256' \) -mtime "+$RETENTION_DAYS" -delete
printf 'Backup criptografado criado: %s\n' "$OUT"
