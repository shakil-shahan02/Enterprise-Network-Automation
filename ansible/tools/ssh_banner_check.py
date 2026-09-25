#!/usr/bin/env python3
"""Log in to a device over SSH (credentials from Ansible Vault) and print the legal banner +
'show ssh' - proves SSH v2 access and the banner pushed by the baseline role.

  ansible-vault view inventory/group_vars/all/vault.yml | python3 tools/ssh_banner_check.py 10.0.0.1
"""
import sys
import time

import paramiko
import yaml

host = sys.argv[1]
secrets = yaml.safe_load(sys.stdin.read())
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username="netadmin", password=secrets["vault_admin_password"],
               look_for_keys=False, allow_agent=False, timeout=20)
t = client.get_transport()
print(f"Connected to {host}  |  {t.remote_version}  |  kex={t.kex_engine.__class__.__name__ if hasattr(t, 'kex_engine') else 'n/a'}  cipher={t.remote_cipher}")
banner = t.get_banner()
print((banner or b"").decode(errors="ignore"))
chan = client.invoke_shell()
time.sleep(2)
chan.send(b"terminal length 0\nshow ssh\nshow users\nexit\n")
time.sleep(5)
print(chan.recv(65535).decode(errors="ignore"))
client.close()
