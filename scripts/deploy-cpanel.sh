#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
config="${HOME}/.config/ashid-apex/deploy-path"
if [[ ! -f "$config" ]]; then
  echo "Set the verified aac.mn Document Root in $config (one absolute path)." >&2
  exit 1
fi
IFS= read -r destination < "$config"
destination="$(realpath -e "$destination")"
account_root="$(realpath -e "$HOME")"
case "$destination" in
  "$account_root"/*) ;;
  *) echo "Document Root must be inside this cPanel account." >&2; exit 1 ;;
esac
repo_root="$(pwd -P)"
case "$destination/" in
  "$repo_root/"*) echo "Document Root must be outside the repository." >&2; exit 1 ;;
esac
[[ -d "$destination" ]] || exit 1
command -v node >/dev/null || { echo "Enable Node.js 20+ in the cPanel shell PATH."; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<20)process.exit(1)'
command -v zip >/dev/null || { echo "zip is required."; exit 1; }
npm run cpanel -- https://aac.mn
# Back up the live directory outside the public web root before replacing files.
backup_root="${HOME}/ashid-apex-backups"
case "$backup_root/" in
  "$destination/"*) echo "Backup directory must be outside Document Root." >&2; exit 1 ;;
esac
mkdir -p "$backup_root"
backup="$(mktemp "$backup_root/before-deploy-XXXXXXXX.tar.gz")"
tar -czf "$backup" -C "$destination" .
# Copy only generated website files. Keep uploads, mail configuration and ACME files.
cp -R dist/cpanel/public_html/. "$destination/"
echo "Deployed $(git rev-parse --short HEAD) to $destination"
echo "Backup: $backup"
