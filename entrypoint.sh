#!/bin/sh
set -e

echo "[entrypoint] Rodando migrations..."
node node_modules/.bin/typeorm -d dist/config/database.config.js migration:run

echo "[entrypoint] Iniciando aplicação..."
exec node dist/main
