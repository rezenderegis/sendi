#!/bin/bash
set -e

echo "Iniciando deploy do Sendi..."

# Pull das últimas alterações
git pull origin main

# Build da nova imagem
docker compose -f docker-compose.prod.yml build app

# Reinicia apenas o app (zero downtime via restart)
docker compose -f docker-compose.prod.yml up -d --no-deps app

# Aguarda app iniciar
echo "Aguardando aplicação iniciar..."
sleep 10

# Verifica se o app está saudável
if docker compose -f docker-compose.prod.yml exec app wget -q --spider http://localhost:3000/health 2>/dev/null; then
  echo "Deploy concluído com sucesso!"
else
  echo "Aplicação não respondeu. Verificando logs..."
  docker compose -f docker-compose.prod.yml logs --tail=50 app
  exit 1
fi

# Remove imagens antigas
docker image prune -f

echo "Deploy finalizado."
