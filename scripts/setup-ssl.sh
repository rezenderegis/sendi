#!/bin/bash
set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Uso: ./scripts/setup-ssl.sh SEU_DOMINIO SEU_EMAIL"
  exit 1
fi

echo "Configurando SSL para domínio: $DOMAIN"

# Substitui o placeholder no nginx.conf
sed -i "s/SEU_DOMINIO/$DOMAIN/g" nginx/default.conf

# Baixa parâmetros Diffie-Hellman recomendados
if [ ! -f "certbot/conf/ssl-dhparams.pem" ]; then
  mkdir -p certbot/conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    > certbot/conf/options-ssl-nginx.conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    > certbot/conf/ssl-dhparams.pem
fi

# Cria certificado dummy para nginx iniciar
mkdir -p certbot/conf/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout certbot/conf/live/$DOMAIN/privkey.pem \
  -out certbot/conf/live/$DOMAIN/fullchain.pem \
  -subj "/CN=$DOMAIN" 2>/dev/null

# Inicia nginx com certificado dummy
docker compose -f docker-compose.prod.yml up -d nginx

# Remove certificado dummy
rm -rf certbot/conf/live

# Solicita certificado real via Let's Encrypt
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# Reinicia nginx com certificado real
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "SSL configurado com sucesso para $DOMAIN"
