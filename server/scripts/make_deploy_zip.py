import os
import zipfile
from pathlib import Path

root = Path('.')
out_zip = root / 'propacks-deploy.zip'
if out_zip.exists():
    out_zip.unlink()

include_dirs = ['src', 'public', 'server']
include_files = ['package.json', 'package-lock.json', '.env.example', 'index.html', 'vite.config.js', 'DEPLOY_HOSTINGER.md']

def add_dir_info(zf, arcname):
    zi = zipfile.ZipInfo(arcname.rstrip('/') + '/')
    zi.create_system = 3  # Unix
    zi.external_attr = (0o40755 << 16) | 0x10
    zf.writestr(zi, b'')

def add_file_info(zf, filepath, arcname):
    zi = zipfile.ZipInfo(arcname)
    zi.create_system = 3  # Unix
    zi.external_attr = (0o100644 << 16)
    zi.compress_type = zipfile.ZIP_DEFLATED
    zf.writestr(zi, filepath.read_bytes())

added_dirs = set()
with zipfile.ZipFile(out_zip, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for f in include_files:
        p = root / f
        if p.exists():
            add_file_info(zf, p, f)
    for d in include_dirs:
        base = root / d
        for item in sorted(base.rglob('*')):
            rel = item.relative_to(root).as_posix()
            # Skip local databases, secrets, or raw files
            if rel.endswith('.db') or rel.endswith('.db-wal') or rel.endswith('.db-shm') or rel.endswith('.jwt_secret'):
                continue
            if item.is_dir():
                if rel not in added_dirs:
                    add_dir_info(zf, rel)
                    added_dirs.add(rel)
            elif item.is_file():
                parent = item.parent.relative_to(root).as_posix()
                if parent != '.' and parent not in added_dirs:
                    add_dir_info(zf, parent)
                    added_dirs.add(parent)
                add_file_info(zf, item, rel)

print(f'Created {out_zip} ({out_zip.stat().st_size} bytes) with Unix 0755/0644 permissions')
