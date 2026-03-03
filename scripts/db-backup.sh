#!/usr/bin/env bash
#
# db-backup.sh — Create a timestamped PostgreSQL backup via the postgres_api container
#
# Usage:
#   ./scripts/db-backup.sh                  # backup to ./backups/<timestamp>.sql.gz
#   ./scripts/db-backup.sh /path/to/dir     # backup to /path/to/dir/<timestamp>.sql.gz
#   ./scripts/db-backup.sh my-backup.sql.gz # backup to specific file
#
set -euo pipefail

CONTAINER="postgres_api"
DB_USER="${POSTGRES_USER:-admin}"
DB_NAME="${POSTGRES_DB:-blog3}"

# Resolve output path
if [[ $# -ge 1 ]]; then
	TARGET="$1"
else
	TARGET=""
fi

if [[ -z "$TARGET" ]]; then
	# Default: ./backups/<timestamp>.sql.gz
	BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
	mkdir -p "$BACKUP_DIR"
	TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
	OUTFILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
elif [[ -d "$TARGET" ]]; then
	# Directory provided
	BACKUP_DIR="$TARGET"
	TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
	OUTFILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
else
	# Specific file path provided
	OUTFILE="$TARGET"
	mkdir -p "$(dirname "$OUTFILE")"
fi

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
	echo "ERROR: Container '${CONTAINER}' is not running."
	echo "Start it with: docker-compose up -d postgres"
	exit 1
fi

echo "Backing up database '${DB_NAME}' from container '${CONTAINER}'..."
echo "Output: ${OUTFILE}"

docker exec "$CONTAINER" \
	pg_dump -U "$DB_USER" -d "$DB_NAME" \
		--clean --if-exists \
		--no-owner --no-privileges \
		--format=plain \
	| gzip > "$OUTFILE"

SIZE=$(du -h "$OUTFILE" | cut -f1)
echo "Done! Backup saved (${SIZE}): ${OUTFILE}"
