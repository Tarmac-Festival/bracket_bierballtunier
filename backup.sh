#!/bin/sh
# Writes a dump of the tournament database and a copy of the uploaded pictures into
# ./backups, and keeps the last 14 of each.
#
#   sh backup.sh
#
# Restoring a dump:
#   docker exec -i bracket-postgres-1 psql -U bracket_dev -d bracket_dev < backups/db-<date>.sql
set -e

cd "$(dirname "$0")"
mkdir -p backups
stamp=$(date +%Y-%m-%d_%H%M)

docker exec bracket-postgres-1 pg_dump -U bracket_dev bracket_dev > "backups/db-$stamp.sql"
docker cp bracket:/app/static "backups/static-$stamp" >/dev/null
tar -czf "backups/static-$stamp.tar.gz" -C backups "static-$stamp"
rm -rf "backups/static-$stamp"

# Only the last fourteen of each are worth keeping.
ls -1t backups/db-*.sql 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t backups/static-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "Gesichert: backups/db-$stamp.sql ($(du -h "backups/db-$stamp.sql" | cut -f1))"
echo "Gesichert: backups/static-$stamp.tar.gz ($(du -h "backups/static-$stamp.tar.gz" | cut -f1))"
