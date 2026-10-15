#!/usr/bin/env bash
set -euo pipefail
version="$1"
hash="$2"
[[ "$version" =~ ^[0-9]+\.[0-9]+$ ]]
[[ "$hash" =~ ^[a-f0-9]{64}$ ]]
name="qingxiaolu-$version-new-signature.apk"
dest=/www/wwwroot/qingxiaolu/frontend
source="/tmp/$name"
stage="$dest/.$name.staging"
test "$(readlink -f "$dest")" = "$dest"
echo "$hash  $source" | sha256sum -c -
if [[ -e "$dest/$name" ]]; then
  echo "$hash  $dest/$name" | sha256sum -c -
  echo "Already published with identical checksum"
  exit 0
fi
test ! -e "$stage"
install -m 644 "$source" "$stage"
# 硬链接排他创建公开文件，防止检查后另一个发布覆盖同名版本。
ln "$stage" "$dest/$name"
rm "$stage"
echo "$hash  $dest/$name" | sha256sum -c -
