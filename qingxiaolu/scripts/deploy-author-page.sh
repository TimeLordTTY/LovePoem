#!/usr/bin/env bash
set -euo pipefail
release="$1"
archive_hash="$2"
index_hash="$3"
[[ "$release" =~ ^qingxiaolu-author-[0-9]{8}-[0-9]{6}$ ]]
dest=/www/wwwroot/qingxiaolu/frontend
archive="/tmp/$release.tar.gz"
stage="/tmp/$release-stage"
backup="/www/backup/$release"
test "$(readlink -f "$dest")" = "$dest"
test -f "$dest/index.html"
test ! -e "$backup"
echo "$archive_hash  $archive" | sha256sum -c -
mkdir "$stage"
tar -xzf "$archive" -C "$stage"
test -d "$stage/assets"
test -d "$stage/runners"
test -f "$stage/offline-sw.js"
echo "$index_hash  $stage/index.html" | sha256sum -c -
mkdir "$backup"
cp -a "$dest/index.html" "$dest/assets" "$dest/runners" "$backup/"
if [[ -f "$dest/offline-sw.js" ]]; then cp -a "$dest/offline-sw.js" "$backup/"; fi
rollback() {
  cp -a "$backup/index.html" "$dest/index.html"
  if [[ -f "$backup/offline-sw.js" ]]; then cp -a "$backup/offline-sw.js" "$dest/offline-sw.js"; else rm -f "$dest/offline-sw.js"; fi
  if [[ "${tool_updated:-0}" = 1 ]]; then
    for file in guide.html chatgpt-qingxiaolu-sync.zip; do
      if [[ -f "$backup/tools/discussion-sync/$file.absent" ]]; then rm -f "$dest/tools/discussion-sync/$file";
      else cp -a "$backup/tools/discussion-sync/$file" "$dest/tools/discussion-sync/$file"; fi
    done
  fi
  echo "Author page restored from backup" >&2
}
trap rollback ERR
if [[ -d "$stage/tools/discussion-sync" ]]; then
  mkdir -p "$dest/tools/discussion-sync"
  test "$(readlink -f "$dest/tools/discussion-sync")" = "$dest/tools/discussion-sync"
  mkdir -p "$backup/tools/discussion-sync"
  for file in guide.html chatgpt-qingxiaolu-sync.zip; do
    test -f "$stage/tools/discussion-sync/$file"
    if [[ -f "$dest/tools/discussion-sync/$file" ]]; then cp -a "$dest/tools/discussion-sync/$file" "$backup/tools/discussion-sync/";
    else touch "$backup/tools/discussion-sync/$file.absent"; fi
  done
  tool_updated=1
  for file in guide.html chatgpt-qingxiaolu-sync.zip; do
    cp "$stage/tools/discussion-sync/$file" "$dest/tools/discussion-sync/.tool-$release-$file"
    chmod 644 "$dest/tools/discussion-sync/.tool-$release-$file"
    mv "$dest/tools/discussion-sync/.tool-$release-$file" "$dest/tools/discussion-sync/$file"
  done
fi
# 保留旧资源，避免已打开页面在更新时失去引用的文件。
cp -a "$stage/assets/." "$dest/assets/"
mkdir -p "$dest/runners"
cp -a "$stage/runners/." "$dest/runners/"
cp "$stage/offline-sw.js" "$dest/.offline-sw-$release"
chmod 644 "$dest/.offline-sw-$release"
mv "$dest/.offline-sw-$release" "$dest/offline-sw.js"
cp "$stage/index.html" "$dest/.index-$release"
chmod 644 "$dest/.index-$release"
mv "$dest/.index-$release" "$dest/index.html"
echo "$index_hash  $dest/index.html" | sha256sum -c -
curl -fsS --max-time 10 https://poem.timelordtty.cn/qingxiaolu/ >/dev/null
curl -fsS --max-time 10 http://127.0.0.1:8082/health
systemctl is-active qingxiaolu-sync.service spring_love-poem.service
trap - ERR
echo "BACKUP=$backup"
echo "DEPLOYED=$release"
