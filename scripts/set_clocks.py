"""Set every IOS device clock to the host's local time (AEST) so NTP can converge.

Dynamips starts each router with the host clock interpreted as UTC, which leaves the
devices ~10 h (and a few minutes from each other) off; NTP will not step offsets that large.
"""
import os
import sys
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "gns3"))
sys.path.insert(0, HERE)
from gns3api import GNS3  # noqa: E402
import console            # noqa: E402


def set_clock(name, port):
    c = console.Console(f"localhost:{port}", echo=False)
    c.enable()
    now = time.strftime("%H:%M:%S %d %b %Y")
    c.cmd(f"clock set {now}")
    out = c.cmd("show clock")
    print(f"{name:12} {out.strip().splitlines()[-2].strip()}")


api = GNS3()
pid = api.project("ENT-HYBRID-NET")["project_id"]
threads = [threading.Thread(target=set_clock, args=(n, d["console"]))
           for n, d in api.nodes(pid).items() if d["node_type"] == "dynamips"]
for t in threads:
    t.start()
for t in threads:
    t.join()
