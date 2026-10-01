"""在服务器复用正在运行的网站认证配置；不输出或复制凭据到开发电脑。"""
import base64
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path

pid = subprocess.check_output(["systemctl", "show", "spring_love-poem.service", "-p", "MainPID", "--value"], text=True).strip()
if not pid.isdigit() or pid == "0":
    raise RuntimeError("网站后台未运行，未修改配置")
environ = dict(value.split(b"=", 1) for value in Path(f"/proc/{pid}/environ").read_bytes().split(b"\0") if b"=" in value)
args = [value.decode() for value in Path(f"/proc/{pid}/cmdline").read_bytes().split(b"\0") if value]
secret = next((value.split("=", 1)[1] for value in args if value.startswith("--jwt.secret=")), None)
if secret is None:
    secret = next((value.split("=", 1)[1] for value in args if value.startswith("-Djwt.secret=")), None)
if secret is None and b"JWT_SECRET" in environ:
    secret = environ[b"JWT_SECRET"].decode()
if secret is None:
    if any("spring.config" in value for value in args):
        raise RuntimeError("网站使用额外配置位置，需要先核对认证配置；未修改任何配置")
    jar = args[args.index("-jar") + 1]
    if not Path(jar).is_absolute():
        jar = str(Path(f"/proc/{pid}/cwd").resolve() / jar)
    with zipfile.ZipFile(jar) as archive:
        config = archive.read("BOOT-INF/classes/application.yml").decode()
    match = re.search(r"^jwt:\s*\n\s+secret:\s*(.+)$", config, re.MULTILINE)
    if not match:
        raise RuntimeError("未找到网站认证配置，未修改配置")
    value = match.group(1).strip().strip("\"'")
    placeholder = re.fullmatch(r"\$\{([^:}]+):(.+)\}", value)
    secret = environ.get(placeholder[1].encode(), placeholder[2].encode()).decode() if placeholder else value
if len(secret.encode()) < 64 or "${" in secret:
    raise RuntimeError("网站签名配置未确认，未修改配置")
if "--check" in sys.argv:
    print("website_auth_source_confirmed=true")
    sys.exit(0)
env_file = Path("/etc/qingxiaolu-sync/qingxiaolu-sync.env")
existing = env_file.read_text()
lines = [line for line in existing.splitlines() if not line.startswith(("WEBSITE_JWT_SECRET=", "WEBSITE_JWT_SECRET_BASE64="))]
lines.append("WEBSITE_JWT_SECRET_BASE64=" + base64.b64encode(secret.encode()).decode())
temp = env_file.with_suffix(".env.upload-tmp")
temp.write_text("\n".join(lines) + "\n")
os.chmod(temp, 0o600)
os.replace(temp, env_file)
print("website_auth_configured=true")
