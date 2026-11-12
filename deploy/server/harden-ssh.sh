#!/usr/bin/env bash
# Key-only SSH, no root login. Run ONLY after `ssh deploy@<server>` works with your key:
#   sudo bash deploy/server/harden-ssh.sh
# 00- sorts before cloud-init's 50-cloud-init.conf (first value wins in sshd).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo"; exit 1; }
[ -s /home/deploy/.ssh/authorized_keys ] || { echo "deploy has no authorized_keys — aborting"; exit 1; }
cat >/etc/ssh/sshd_config.d/00-divineaura.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
EOF
sshd -t
systemctl reload ssh
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication) '
