#!/bin/sh
set -eu

: "${POSTGRES_DB:=postgres}"
: "${POSTGRES_USER:=postgres}"

: "${MONITORING_USER:=monitoring}"
: "${MONITORING_PASSWORD:=monitoring_secure_pass}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v DB_NAME="$POSTGRES_DB" \
  -v MONITORING_USER="$MONITORING_USER" \
  -v MONITORING_PASSWORD="$MONITORING_PASSWORD" \
  -f /docker-entrypoint-initdb.d/01_init.sql
