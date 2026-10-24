#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
CONTAINER="${BACKUP_CONTAINER:-naregua-app}"
DEST="${BACKUP_HOST_DIR:-/opt/lashdesigner/backups-v3}"
: "${BACKUP_REMOTE_TARGET:?Configure um destino SSH externo em BACKUP_REMOTE_TARGET}"
mkdir -p "$DEST"
chmod 700 "$DEST"
docker exec "$CONTAINER" /app/deploy/backup.sh
LATEST="$(docker exec "$CONTAINER" sh -c 'ls -1 /data/backups/naregua-*.sqlite.gz.enc | sort | tail -n 1')"
test -n "$LATEST"
NAME="$(basename "$LATEST")"
docker cp "$CONTAINER:$LATEST" "$DEST/$NAME"
docker cp "$CONTAINER:$LATEST.sha256" "$DEST/$NAME.sha256"
MEDIA_NAME="${NAME%.sqlite.gz.enc}.media.tar.gz.enc"
docker cp "$CONTAINER:/data/backups/$MEDIA_NAME" "$DEST/$MEDIA_NAME"
docker cp "$CONTAINER:/data/backups/$MEDIA_NAME.sha256" "$DEST/$MEDIA_NAME.sha256"
chmod 600 "$DEST/$NAME" "$DEST/$NAME.sha256" "$DEST/$MEDIA_NAME" "$DEST/$MEDIA_NAME.sha256"
scp -B -o BatchMode=yes "$DEST/$NAME" "$DEST/$NAME.sha256" "$DEST/$MEDIA_NAME" "$DEST/$MEDIA_NAME.sha256" "$BACKUP_REMOTE_TARGET"
printf 'Backup consistente, criptografado e exportado: %s\n' "$NAME"
