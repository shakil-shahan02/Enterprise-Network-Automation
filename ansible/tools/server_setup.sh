#!/usr/bin/env bash
# One-time / idempotent setup of the ANSIBLE-SRV control node (Debian 12, python:3.12-slim).
# Everything under /root/ansible is on a persistent GNS3 volume; OS packages are re-installed
# after a container re-creation by simply re-running this script.
set -euo pipefail
cd /root/ansible

if ! command -v ping >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq iproute2 iputils-ping openssh-client sshpass git dnsutils traceroute nano less tree
fi

if [ ! -x venv/bin/ansible ]; then
  python3 -m venv venv
  venv/bin/pip install -q --upgrade pip
  venv/bin/pip install -q -r requirements.txt
fi
# cisco.ios / ansible.netcommon / ansible.utils ship with the 'ansible' package; to pin newer
# versions instead run:  venv/bin/ansible-galaxy collection install -r requirements.yml

# legacy IOS (12.4 / 15.0) only offers ssh-rsa host keys + older KEX/ciphers - allow them for
# the automation client only (paramiko is used by network_cli; OpenSSH for manual checks)
cat > /root/.ssh_config_legacy <<'EOF'
Host 10.*
  KexAlgorithms +diffie-hellman-group14-sha1,diffie-hellman-group1-sha1
  HostKeyAlgorithms +ssh-rsa
  PubkeyAcceptedAlgorithms +ssh-rsa
  Ciphers +aes128-cbc,aes256-cbc,3des-cbc
  StrictHostKeyChecking accept-new
EOF
mkdir -p /root/.ssh && cp /root/.ssh_config_legacy /root/.ssh/config

# central syslog collector (UDP 514)
if ! pgrep -f syslog_server.py >/dev/null; then
  nohup venv/bin/python tools/syslog_server.py >/dev/null 2>&1 &
fi
echo "ANSIBLE-SRV ready: $(venv/bin/ansible --version | head -1)"
