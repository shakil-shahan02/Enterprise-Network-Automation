"""Day-0 bootstrap: push configs/*.cfg to every router/switch over the GNS3 console, in parallel,
and configure the VPCS end hosts.

  python bootstrap.py              # all devices
  python bootstrap.py R1-HQ SW1-HQ-DIST
"""
import json
import os
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "gns3"))
sys.path.insert(0, HERE)
from gns3api import GNS3          # noqa: E402
import console                    # noqa: E402

VPCS = {
    "PC-IT1": ["ip dhcp", "save"],
    "PC-FIN1": ["ip dhcp", "save"],
    "PC-GUEST1": ["ip dhcp", "save"],
    "PC-SALES1": ["ip dhcp", "save"],
    "PC-OPS1": ["ip dhcp", "save"],
    "SRV-WEB1": ["ip 10.30.60.10/24 10.30.60.1", "ip dns 10.0.0.3", "ip domain corp.local", "save"],
}


def render(name, secrets):
    with open(os.path.join(ROOT, "configs", f"{name}.cfg"), encoding="utf-8") as f:
        text = f.read()
    for key, val in secrets.items():
        text = text.replace(f"__{key}__", val)
    tmp = tempfile.NamedTemporaryFile("w", suffix=".cfg", delete=False, encoding="utf-8")
    tmp.write(text)
    tmp.close()
    return tmp.name


def push_ios(name, target, secrets, log_dir):
    path = render(name, secrets)
    log = open(os.path.join(log_dir, f"{name}.log"), "w", encoding="utf-8")
    old = sys.stdout
    try:
        c = console.Console(target, echo=False)
        c.enable()
        exec_mode, lines = False, []
        for raw in open(path, encoding="utf-8"):
            line = raw.rstrip("\n")
            if line.startswith("!EXEC-BEGIN"):
                exec_mode = True
            elif line.startswith("!EXEC-END"):
                exec_mode = False
            elif exec_mode:
                log.write(c.cmd(line))
            elif line.strip() and not line.lstrip().startswith("!"):
                lines.append(line)
        log.write(c.cmd("configure terminal"))
        for line in lines:
            log.write(c.cmd(line))
        log.write(c.cmd("end"))
        log.write(c.cmd("write memory"))
        errors = [l for l in open(log.name, encoding="utf-8").read().splitlines() if "% " in l]
        print(f"[{name}] done - {len(errors)} IOS error lines")
        for e in errors:
            print(f"   [{name}] {e.strip()}")
    finally:
        sys.stdout = old
        log.close()
        os.unlink(path)


def push_vpcs(name, target, cmds):
    c = console.Console(target, echo=False)
    out = ""
    for cmd in cmds:
        c.s.sendall(cmd.encode() + b"\r")
        out += c.read_until_prompt(20)
    print(f"[{name}] {out.strip().splitlines()[-2] if out.strip() else ''}")


def main():
    with open(os.path.join(HERE, "secrets.local.json"), encoding="utf-8") as f:
        secrets = json.load(f)
    api = GNS3()
    pid = api.project("ENT-HYBRID-NET")["project_id"]
    nodes = api.nodes(pid)
    only = set(sys.argv[1:])
    log_dir = os.path.join(ROOT, "evidence", "bootstrap-logs")
    os.makedirs(log_dir, exist_ok=True)
    threads = []
    for name, n in nodes.items():
        if only and name not in only:
            continue
        target = f"{n['console_host'] if n['console_host'] not in ('0.0.0.0', '::') else 'localhost'}:{n['console']}"
        if n["node_type"] == "dynamips":
            t = threading.Thread(target=push_ios, args=(name, target, secrets, log_dir))
        elif n["node_type"] == "vpcs":
            t = threading.Thread(target=push_vpcs, args=(name, target, [f"set pcname {name}"] + VPCS[name]))
        else:
            continue
        t.start()
        threads.append(t)
    for t in threads:
        t.join()


if __name__ == "__main__":
    main()
