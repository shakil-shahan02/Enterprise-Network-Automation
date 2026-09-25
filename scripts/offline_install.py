"""Offline installation of Ansible on ANSIBLE-SRV.

The in-lab Internet path (R3 -> R4 PAT -> GNS3 NAT, all emulated by Dynamips) is too slow for
multi-MB downloads, so wheels and Galaxy collections are downloaded on the host:

  pip download -d <dir>/wheels --platform manylinux2014_x86_64 --python-version 3.12 \
      --only-binary=:all: "ansible-core>=2.17,<2.18" paramiko==3.5.1 netaddr jmespath
  <dir>/collections/  cisco-ios-11.6.0 / ansible-netcommon-8.7.1 / ansible-utils-6.1.1 / ansible-posix-2.2.2

then copied into the container via the GNS3 files API and installed with --no-index / --offline.

  python offline_install.py <dir>
"""
import io
import os
import sys
import tarfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "gns3"))
sys.path.insert(0, HERE)
from gns3api import GNS3  # noqa: E402
import console            # noqa: E402

src = sys.argv[1]
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w:gz") as tar:
    tar.add(os.path.join(src, "wheels"), arcname="wheels")
    tar.add(os.path.join(src, "collections"), arcname="collections")

api = GNS3()
pid = api.project("ENT-HYBRID-NET")["project_id"]
n = api.nodes(pid)["ANSIBLE-SRV"]
api.post(f"/projects/{pid}/nodes/{n['node_id']}/files/etc/network/.offline.tgz", buf.getvalue(), timeout=600)
print(f"uploaded {len(buf.getvalue()) // 1024} KB")

c = console.Console(f"{n['console_host']}:{n['console']}", echo=True, prompt=console.SHELL_PROMPT)
c.wake(5)
for cmd in [
    "rm -rf /tmp/offline && mkdir -p /tmp/offline && tar xzf /etc/network/.offline.tgz -C /tmp/offline && rm -f /etc/network/.offline.tgz",
    "[ -x /root/ansible/venv/bin/python ] || python3 -m venv /root/ansible/venv",
    "/root/ansible/venv/bin/pip install -q --no-index --find-links /tmp/offline/wheels 'ansible-core>=2.17,<2.18' paramiko netaddr jmespath; echo PIP_RC=$?",
    "/root/ansible/venv/bin/ansible-galaxy collection install --offline -p /root/.ansible/collections /tmp/offline/collections/*.tar.gz 2>&1 | tail -5",
    "/root/ansible/venv/bin/ansible --version | head -2; /root/ansible/venv/bin/ansible-galaxy collection list 2>/dev/null | grep -E 'cisco|ansible\\.'",
]:
    c.cmd(cmd, timeout=900)
print()
