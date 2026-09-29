#!/usr/bin/env bash
set -euo pipefail

archive=/tmp/qingxiaolu-deploy-20260724-1725.tgz
target=/www/wwwroot/qingxiaolu
stamp=$(date +%Y%m%d-%H%M%S)
backup=/www/backup/qingxiaolu-$stamp
nginx_conf=/www/server/panel/vhost/nginx/java_love-poem.conf
jar=/www/wwwroot/love-poem/backend/love-poem-backend-1.0.0.jar

test -f "$archive"
test -f "$nginx_conf"
test -f "$jar"
mkdir -p /www/backup
if [ -d "$target" ]; then
  cp -a "$target" "$backup"
fi
cp -a "$nginx_conf" "$nginx_conf.bak-$stamp"

stage=$(mktemp -d /tmp/qingxiaolu.XXXXXX)
trap 'rm -rf "$stage"' EXIT
tar -xzf "$archive" -C "$stage"
npm --prefix "$stage/backend" ci --omit=dev

config=$(unzip -p "$jar" 'BOOT-INF/classes/application*.yml')
db_user=$(printf '%s' "$config" | sed -nE 's/^[[:space:]]*username:[[:space:]]*\$\{DB_USERNAME:([^}]*)\}.*/\1/p' | head -1)
db_password=$(printf '%s' "$config" | sed -nE 's/^[[:space:]]*password:[[:space:]]*\$\{DB_PASSWORD:([^}]*)\}.*/\1/p' | head -1)
test -n "$db_user"
test -n "$db_password"

MYSQL_PWD="$db_password" /www/server/mysql/bin/mysql \
  -h127.0.0.1 -P9009 -u"$db_user" poem < "$stage/backend/schema.sql"

mkdir -p /etc/qingxiaolu-sync
if [ ! -f /etc/qingxiaolu-sync/qingxiaolu-sync.env ]; then
  sync_token=$(openssl rand -hex 32)
else
  sync_token=$(sed -n 's/^SYNC_TOKEN=//p' /etc/qingxiaolu-sync/qingxiaolu-sync.env)
fi
{
  echo "HOST=127.0.0.1"
  echo "PORT=8082"
  echo "DB_HOST=127.0.0.1"
  echo "DB_PORT=9009"
  echo "DB_NAME=poem"
  printf 'DB_USER_BASE64=%s\n' "$(printf '%s' "$db_user" | base64 -w0)"
  printf 'DB_PASSWORD_BASE64=%s\n' "$(printf '%s' "$db_password" | base64 -w0)"
  echo "SYNC_TOKEN=$sync_token"
} > /etc/qingxiaolu-sync/qingxiaolu-sync.env
chmod 600 /etc/qingxiaolu-sync/qingxiaolu-sync.env

mkdir -p "$target"
rm -rf "$target/backend.new" "$target/frontend.new"
mv "$stage/backend" "$target/backend.new"
mv "$stage/frontend" "$target/frontend.new"
rm -rf "$target/backend.old" "$target/frontend.old"
if [ -d "$target/backend" ]; then mv "$target/backend" "$target/backend.old"; fi
if [ -d "$target/frontend" ]; then mv "$target/frontend" "$target/frontend.old"; fi
mv "$target/backend.new" "$target/backend"
mv "$target/frontend.new" "$target/frontend"
chown -R www:www "$target"

cp "$stage/qingxiaolu-sync.service" /etc/systemd/system/qingxiaolu-sync.service
systemctl daemon-reload
systemctl enable --now qingxiaolu-sync.service

if ! grep -q 'location = /qingxiaolu' "$nginx_conf"; then
  sed -i '/^[[:space:]]*# 日志配置/i\
    location = /qingxiaolu { return 301 /qingxiaolu/; }\
    location /qingxiaolu/ {\
        alias /www/wwwroot/qingxiaolu/frontend/;\
        index index.html;\
        try_files $uri $uri/ /qingxiaolu/index.html;\
    }\
    location /qingxiaolu-api/ {\
        proxy_pass http://127.0.0.1:8082/;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
    }\
' "$nginx_conf"
fi

/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
curl -fsS http://127.0.0.1:8082/health >/dev/null
echo "DEPLOY_OK backup=$backup"
