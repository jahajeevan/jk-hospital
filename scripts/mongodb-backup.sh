#!/usr/bin/env sh
set -eu

: "${MONGODB_URI:?MONGODB_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGODB_URI" --archive="$BACKUP_DIR/jk-hospital-$STAMP.archive" --gzip
find "$BACKUP_DIR" -type f -name '*.archive' -mtime +14 -delete

