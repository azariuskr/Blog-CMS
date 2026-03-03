#!/usr/bin/env bash
#
# db-restore.sh — Restore a PostgreSQL backup into the postgres_api container
#
# Usage:
#   ./scripts/db-restore.sh backups/blog3_20260222_120000.sql.gz
#   ./scripts/db-restore.sh backups/blog3_20260222_120000.sql
#   ./scripts/db-restore.sh              # lists available backups and prompts
#
set -euo pipefail

CONTAINER="postgres_api"
DB_USER="${POSTGRES_USER:-admin}"
DB_NAME="${POSTGRES_DB:-blog3}"

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
	echo "ERROR: Container '${CONTAINER}' is not running."
	echo "Start it with: docker-compose up -d postgres"
	exit 1
fi

# Resolve backup file
if [[ $# -ge 1 ]]; then
	BACKUP_FILE="$1"
else
	# List available backups
	BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
	if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
		echo "No backups found in ${BACKUP_DIR}"
		echo "Usage: $0 <backup-file.sql.gz>"
		exit 1
	fi

	echo "Available backups:"
	echo ""
	BACKUPS=()
	i=1
	for f in $(ls -t "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*.sql 2>/dev/null); do
		SIZE=$(du -h "$f" | cut -f1)
		echo "  ${i}) $(basename "$f")  (${SIZE})"
		BACKUPS+=("$f")
		i=$((i + 1))
	done
	echo ""

	if [[ ${#BACKUPS[@]} -eq 0 ]]; then
		echo "No .sql or .sql.gz files found."
		exit 1
	fi

	read -rp "Select backup number (1-${#BACKUPS[@]}): " CHOICE
	if [[ "$CHOICE" -lt 1 || "$CHOICE" -gt ${#BACKUPS[@]} ]]; then
		echo "Invalid selection."
		exit 1
	fi
	BACKUP_FILE="${BACKUPS[$((CHOICE - 1))]}"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
	echo "ERROR: File not found: ${BACKUP_FILE}"
	exit 1
fi

echo ""
echo "WARNING: This will DROP and recreate all tables in '${DB_NAME}'."
echo "Backup file: ${BACKUP_FILE}"
read -rp "Continue? (y/N): " CONFIRM
if [[ "${CONFIRM,,}" != "y" ]]; then
	echo "Aborted."
	exit 0
fi

echo ""
echo "Terminating active connections to '${DB_NAME}'..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
	"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
	>/dev/null 2>&1 || true

echo "Restoring database '${DB_NAME}' from: $(basename "$BACKUP_FILE")"

if [[ "$BACKUP_FILE" == *.gz ]]; then
	gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" --single-transaction -q
else
	docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" --single-transaction -q < "$BACKUP_FILE"
fi

echo "Done! Database '${DB_NAME}' restored successfully."
echo ""
echo "NOTE: If using Redis cache, you may want to restart the web container:"
echo "  docker restart <web-container>"
