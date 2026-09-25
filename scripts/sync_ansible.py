"""Sync the Ansible project between this repo and ANSIBLE-SRV (/root/ansible).

  python sync_ansible.py push   # repo ansible/ -> tar bundle -> container /root/ansible
  python sync_ansible.py pull   # container backups/ reports/ logs/ -> repo ansible/

The GNS3 node files API can only write where the GNS3 server owns the directory, so the bundle
travels through the container's /etc/network volume and is unpacked with a console command.
"""
import io
import os
import sys
import tarfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "gns3"))
sys.path.insert(0, HERE)
from gns3api import GNS3  # noqa: E402
import console            # noqa: E402

SRC = os.path.join(ROOT, "ansible")
SKIP_DIRS = {"backups", "reports", "logs", "venv", "collections", "__pycache__", ".ansible"}
BUNDLE = "etc/network/.ansible_bundle.tgz"
OUT = "etc/network/.ansible_out.tgz"


def ctx():
    api = GNS3()
    pid = api.project("ENT-HYBRID-NET")["project_id"]
    n = api.nodes(pid)["ANSIBLE-SRV"]
    return api, pid, n["node_id"], f"{n['console_host']}:{n['console']}"


def sh(target, *cmds):
    c = console.Console(target, echo=False, prompt=console.SHELL_PROMPT)
    c.wake(5)
    return "".join(c.cmd(x, timeout=120) for x in cmds)


def push():
    api, pid, nid, target = ctx()
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for base, dirs, files in os.walk(SRC):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                full = os.path.join(base, f)
                tar.add(full, arcname=os.path.relpath(full, SRC).replace("\\", "/"))
    api.post(f"/projects/{pid}/nodes/{nid}/files/{BUNDLE}", buf.getvalue())
    out = sh(target, "mkdir -p /root/ansible/{backups/latest,reports,logs} && "
                     "tar xzf /etc/network/.ansible_bundle.tgz -C /root/ansible && "
                     "rm -f /etc/network/.ansible_bundle.tgz && echo SYNC_OK $(find /root/ansible -path /root/ansible/venv -prune -o -type f -print | wc -l)")
    print([l for l in out.splitlines() if "SYNC_OK" in l and "echo" not in l] or out[-300:])


def pull():
    api, pid, nid, target = ctx()
    sh(target, "cd /root/ansible && tar czf /etc/network/.ansible_out.tgz backups reports logs && echo PACK_OK")
    data = api.get(f"/projects/{pid}/nodes/{nid}/files/{OUT}", raw=True)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        tar.extractall(SRC, filter="data")
        names = [m.name for m in tar.getmembers() if m.isfile()]
    sh(target, "rm -f /etc/network/.ansible_out.tgz")
    print(f"pulled {len(names)} files into ansible/")


if __name__ == "__main__":
    {"push": push, "pull": pull}[sys.argv[1]]()
