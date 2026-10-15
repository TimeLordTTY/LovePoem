#!/usr/bin/env bash
set -euo pipefail
release="$1"
expected="$2"
server_hash="$3"
schema_hash="$4"
[[ "$release" =~ ^qingxiaolu-mind-tree-[0-9]{8}-[0-9]{6}$ ]]
dest=/www/wwwroot/qingxiaolu/backend
backup="/www/backup/$release"
test "$(readlink -f "$dest")" = "$dest"
test ! -e "$backup"
echo "$expected  $dest/server.mjs" | sha256sum -c -
echo "$server_hash  /tmp/$release-server.mjs" | sha256sum -c -
echo "$schema_hash  /tmp/$release-schema.mjs" | sha256sum -c -
/usr/local/bin/qingxiaolu-node --check "/tmp/$release-server.mjs"
/usr/local/bin/qingxiaolu-node --check "/tmp/$release-schema.mjs"
java_pid=$(systemctl show spring_love-poem.service -p MainPID --value)
java_hash=$(sha256sum /www/wwwroot/love-poem/backend/love-poem-backend-1.0.0.jar | cut -d ' ' -f 1)
mkdir "$backup"
cp -p "$dest/server.mjs" "$backup/server.mjs"
if [[ -f "$dest/mind-tree-schema.mjs" ]]; then cp -p "$dest/mind-tree-schema.mjs" "$backup/";
else touch "$backup/schema.absent"; fi
rollback() {
  cp -p "$backup/server.mjs" "$dest/server.mjs"
  if [[ -f "$backup/schema.absent" ]]; then rm -f "$dest/mind-tree-schema.mjs";
  else cp -p "$backup/mind-tree-schema.mjs" "$dest/"; fi
  systemctl restart qingxiaolu-sync.service
  echo "RESTORED=$backup" >&2
}
trap rollback ERR
for pair in schema:mind-tree-schema server:server; do
  source="/tmp/$release-${pair%%:*}.mjs"
  target="$dest/${pair##*:}.mjs"
  cp "$source" "$target.$release"
  chmod --reference="$dest/server.mjs" "$target.$release"
  chown --reference="$dest/server.mjs" "$target.$release"
  mv "$target.$release" "$target"
done
systemctl restart qingxiaolu-sync.service
for attempt in {1..10}; do
  if curl -fsS --max-time 3 http://127.0.0.1:8082/health; then break; fi
  sleep 1
done
curl -fsS --max-time 5 http://127.0.0.1:8082/health
systemctl is-active qingxiaolu-sync.service spring_love-poem.service
test "$java_pid" = "$(systemctl show spring_love-poem.service -p MainPID --value)"
test "$java_hash" = "$(sha256sum /www/wwwroot/love-poem/backend/love-poem-backend-1.0.0.jar | cut -d ' ' -f 1)"
trap - ERR
echo "BACKUP=$backup"
echo "Original website process and JAR unchanged"
