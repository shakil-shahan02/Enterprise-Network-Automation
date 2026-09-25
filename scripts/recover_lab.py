"""Recover the lab after the GNS3 VM freezes.

Root cause on this host: VirtualBox runs the GNS3 VM through Hyper-V (NEM, "VT-x is not
available"), which periodically freezes the guest. This script:
  1. hard-resets the GNS3 VM and waits for its API,
  2. closes/re-opens the project so the controller re-registers it on the VM compute,
  3. starts every node, waits for OSPF to converge on R4-CORE,
  4. re-syncs device clocks and restarts the syslog collector on ANSIBLE-SRV.
"""
import os
import socket
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "gns3"))
sys.path.insert(0, HERE)
from gns3api import GNS3  # noqa: E402
import console            # noqa: E402

VBOX = r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"


def port_open(host, port, t=3):
    try:
        socket.create_connection((host, port), timeout=t).close()
        return True
    except OSError:
        return False


def wait(cond, timeout, step=5, what=""):
    end = time.time() + timeout
    while time.time() < end:
        if cond():
            return True
        time.sleep(step)
    raise TimeoutError(what)


if not port_open("192.168.56.104", 80):
    print("GNS3 VM not responding - resetting")
    subprocess.run([VBOX, "controlvm", "GNS3 VM", "reset"], check=True)
wait(lambda: port_open("192.168.56.104", 80), 300, what="GNS3 VM API")
time.sleep(15)

api = GNS3()
pid = api.project("ENT-HYBRID-NET")["project_id"]
try:
    api.post(f"/projects/{pid}/close", timeout=600)
except RuntimeError as e:
    print("close:", str(e)[:100])
api.post(f"/projects/{pid}/open", timeout=600)
api.post(f"/projects/{pid}/nodes/start", timeout=900)
print("project re-opened, nodes started, links:", len(api.get(f"/projects/{pid}/links")))


def ospf_full():
    try:
        c = console.Console("localhost:5000", echo=False)
        c.enable()
        return c.cmd("show ip ospf neighbor").count("FULL") == 3
    except Exception:  # noqa: BLE001
        return False


wait(ospf_full, 600, step=15, what="OSPF convergence")
print("OSPF converged")
subprocess.run([sys.executable, os.path.join(HERE, "set_clocks.py")], check=False, capture_output=True)
c = console.Console("192.168.56.104:5001", echo=False, prompt=console.SHELL_PROMPT)
c.wake(5)
print(c.cmd("cd /root/ansible && (nohup python3 tools/syslog_server.py >/dev/null 2>&1 &); "
            "python3 tools/tcpcheck.py | grep -c OPEN", timeout=120).strip().splitlines()[-2], "devices reachable over SSH")
