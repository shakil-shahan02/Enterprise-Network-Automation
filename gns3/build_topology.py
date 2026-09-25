"""Build the ENT-HYBRID-NET GNS3 project from scratch via the GNS3 REST API.

Hierarchical design (top -> bottom):
  Internet edge / Core layer : INTERNET-NAT, R4-CORE
  Distribution layer         : R1-HQ, R3-DC, R2-BR  +  SW1/SW3/SW5 distribution switches
  Access layer               : SW2/SW4/SW6 access switches + end hosts / servers

Usage:  python build_topology.py [--rebuild]
"""
import sys
import time

from gns3api import GNS3

PROJECT = "ENT-HYBRID-NET"
C7200_IMG = "c7200-adventerprisek9_sna-mz.150-1.M.image"
C2691_IMG = "c2691-adventerprisek9_sna-mz.124-23.image"
AUTOMATION_IMG = "python:3.12-slim"

# Site column centres and layer rows (scene coordinates)
HQ, DC, BR = -560, -40, 480
Y_NET, Y_CORE, Y_RTR, Y_DIST, Y_ACC, Y_HOST = -500, -370, -215, -60, 95, 265

ROUTER = {"platform": "c7200", "image": C7200_IMG, "ram": 512, "idlepc": "0x60779618",
          "slot0": "C7200-IO-FE", "slot1": "PA-2FE-TX", "slot2": "PA-2FE-TX"}
SWITCH = {"platform": "c2691", "image": C2691_IMG, "ram": 160, "idlepc": "0x60b912bc",
          "slot0": "GT96100-FE", "slot1": "NM-16ESW"}

NODES = [
    # name,          type,       compute, x,        y,       symbol,                              props
    ("INTERNET-NAT", "nat",      "vm",    DC,       Y_NET,   ":/symbols/cloud.svg",               {}),
    ("R4-CORE",      "dynamips", "local", DC,       Y_CORE,  ":/symbols/router.svg",              ROUTER),
    ("R1-HQ",        "dynamips", "local", HQ,       Y_RTR,   ":/symbols/router.svg",              ROUTER),
    ("R3-DC",        "dynamips", "local", DC,       Y_RTR,   ":/symbols/router.svg",              ROUTER),
    ("R2-BR",        "dynamips", "local", BR,       Y_RTR,   ":/symbols/router.svg",              ROUTER),
    ("SW1-HQ-DIST",  "dynamips", "local", HQ,       Y_DIST,  ":/symbols/multilayer_switch.svg",   SWITCH),
    ("SW3-BR-DIST",  "dynamips", "local", BR,       Y_DIST,  ":/symbols/multilayer_switch.svg",   SWITCH),
    ("SW5-DC-DIST",  "dynamips", "local", DC,       Y_DIST,  ":/symbols/multilayer_switch.svg",   SWITCH),
    ("SW2-HQ-ACC",   "dynamips", "local", HQ,       Y_ACC,   ":/symbols/ethernet_switch.svg",     SWITCH),
    ("SW4-BR-ACC",   "dynamips", "local", BR,       Y_ACC,   ":/symbols/ethernet_switch.svg",     SWITCH),
    ("SW6-DC-ACC",   "dynamips", "local", DC,       Y_ACC,   ":/symbols/ethernet_switch.svg",     SWITCH),
    ("PC-IT1",       "vpcs",     "vm",    HQ - 150, Y_HOST,  ":/symbols/computer.svg",            {}),
    ("PC-FIN1",      "vpcs",     "vm",    HQ,       Y_HOST,  ":/symbols/computer.svg",            {}),
    ("PC-GUEST1",    "vpcs",     "vm",    HQ + 150, Y_HOST,  ":/symbols/computer.svg",            {}),
    ("SRV-WEB1",     "vpcs",     "vm",    DC - 90,  Y_HOST,  ":/symbols/server.svg",              {}),
    ("ANSIBLE-SRV",  "docker",   "vm",    DC + 90,  Y_HOST,  ":/symbols/server.svg",
     {"image": AUTOMATION_IMG, "adapters": 1, "console_type": "telnet",
      "start_command": "/bin/bash", "extra_volumes": ["/root/ansible"],
      "environment": "TZ=Australia/Sydney"}),
    ("PC-SALES1",    "vpcs",     "vm",    BR - 80,  Y_HOST,  ":/symbols/computer.svg",            {}),
    ("PC-OPS1",      "vpcs",     "vm",    BR + 80,  Y_HOST,  ":/symbols/computer.svg",            {}),
]

# (nodeA, adapter, port, nodeB, adapter, port)   c7200: f<adapter>/<port>, NM-16ESW = adapter 1
LINKS = [
    ("INTERNET-NAT", 0, 0, "R4-CORE", 0, 0),       # nat0      <-> R4 f0/0 (outside)
    ("R4-CORE", 1, 0, "R1-HQ", 1, 0),              # R4 f1/0   <-> R1 f1/0  10.255.0.0/30
    ("R4-CORE", 1, 1, "R2-BR", 1, 0),              # R4 f1/1   <-> R2 f1/0  10.255.0.4/30
    ("R4-CORE", 2, 0, "R3-DC", 1, 0),              # R4 f2/0   <-> R3 f1/0  10.255.0.8/30
    ("R1-HQ", 1, 1, "R3-DC", 1, 1),                # R1 f1/1   <-> R3 f1/1  10.255.0.12/30 (HQ-DC backup)
    ("R1-HQ", 0, 0, "SW1-HQ-DIST", 1, 0),          # router-on-a-stick trunks
    ("R2-BR", 0, 0, "SW3-BR-DIST", 1, 0),
    ("R3-DC", 0, 0, "SW5-DC-DIST", 1, 0),
    ("SW1-HQ-DIST", 1, 1, "SW2-HQ-ACC", 1, 1),     # dual trunks dist <-> access (STP)
    ("SW1-HQ-DIST", 1, 2, "SW2-HQ-ACC", 1, 2),
    ("SW3-BR-DIST", 1, 1, "SW4-BR-ACC", 1, 1),
    ("SW3-BR-DIST", 1, 2, "SW4-BR-ACC", 1, 2),
    ("SW5-DC-DIST", 1, 1, "SW6-DC-ACC", 1, 1),
    ("SW5-DC-DIST", 1, 2, "SW6-DC-ACC", 1, 2),
    ("SW2-HQ-ACC", 1, 5, "PC-IT1", 0, 0),          # access ports
    ("SW2-HQ-ACC", 1, 6, "PC-FIN1", 0, 0),
    ("SW2-HQ-ACC", 1, 7, "PC-GUEST1", 0, 0),
    ("SW6-DC-ACC", 1, 5, "SRV-WEB1", 0, 0),
    ("SW6-DC-ACC", 1, 6, "ANSIBLE-SRV", 0, 0),
    ("SW4-BR-ACC", 1, 5, "PC-SALES1", 0, 0),
    ("SW4-BR-ACC", 1, 6, "PC-OPS1", 0, 0),
]


def text(t, size=10, color="#000000", bold=True, w=260):
    """One GNS3 text drawing per line (GNS3 does not render <tspan>). Returns [(dy, svg), ...]."""
    weight = "bold" if bold else "normal"
    return [(int(i * size * 1.45),
             f'<svg height="{int(size * 1.6)}" width="{w}"><text font-family="Arial" font-size="{size}" '
             f'font-weight="{weight}" fill="{color}" fill-opacity="1.0">{line}</text></svg>')
            for i, line in enumerate(t.split("\n"))]


def rect(w, h, stroke, fill, dash="", opacity=0.18):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<svg height="{h}" width="{w}"><rect height="{h}" width="{w}" fill="{fill}" '
            f'fill-opacity="{opacity}" stroke="{stroke}" stroke-width="2"{d}/></svg>')


def hline(w, color="#7f8c8d"):
    return (f'<svg height="2" width="{w}"><line x1="0" x2="{w}" y1="0" y2="0" stroke="{color}" '
            f'stroke-width="1" stroke-dasharray="6, 4"/></svg>')


DRAWINGS = [
    # site boundaries (z=0 so they sit behind nodes)
    (HQ - 245, Y_RTR - 75, 0, rect(490, 650, "#1f6feb", "#dbe9ff")),
    (DC - 245, Y_RTR - 75, 0, rect(490, 650, "#1a7f37", "#dcffe4")),
    (BR - 245, Y_RTR - 75, 0, rect(490, 650, "#bf5b04", "#fff1dc")),
    (DC - 245, Y_CORE - 50, 0, rect(490, 115, "#8250df", "#efe6ff")),
    # layer separators + labels
    (HQ - 470, Y_CORE + 72, 1, hline(1640)),
    (HQ - 470, Y_ACC - 25, 1, hline(1640)),
    (HQ - 470, Y_CORE - 10, 2, text("CORE /\nINTERNET EDGE", 13, "#8250df", w=200)),
    (HQ - 470, Y_RTR + 40, 2, text("DISTRIBUTION\nLAYER", 13, "#24292f", w=200)),
    (HQ - 470, Y_ACC + 50, 2, text("ACCESS\nLAYER", 13, "#24292f", w=200)),
    # titles
    (HQ - 470, Y_NET - 40, 2, text("ENT-HYBRID-NET  |  Hierarchical Enterprise Network (Core / Distribution / Access)", 18, "#0d1117", w=1100)),
    (HQ - 470, Y_NET - 8, 2, text("OSPF multi-area: Area 0 backbone, Area 10 HQ, Area 20 Branch, Area 30 DC  |  PAT to Internet on R4-CORE", 11, "#57606a", bold=False, w=1100)),
    (HQ - 235, Y_RTR - 68, 2, text("HEADQUARTERS  (10.10.0.0/16  -  OSPF Area 10)", 12, "#1f6feb", w=480)),
    (DC - 235, Y_RTR - 68, 2, text("DATA CENTRE  (10.30.0.0/16  -  OSPF Area 30)", 12, "#1a7f37", w=480)),
    (BR - 235, Y_RTR - 68, 2, text("BRANCH OFFICE  (10.20.0.0/16  -  OSPF Area 20)", 12, "#bf5b04", w=480)),
    (DC - 235, Y_CORE - 45, 2, text("CORE  (OSPF Area 0)", 12, "#8250df", w=300)),
    # link subnet labels
    (DC + 60, Y_NET + 60, 2, text("f0/0  DHCP / NAT outside", 9, "#57606a", bold=False)),
    (HQ + 100, Y_CORE + 45, 2, text("10.255.0.0/30", 9, "#8250df")),
    (DC + 12, Y_CORE + 38, 2, text("10.255.0.8/30", 9, "#8250df")),
    (BR - 190, Y_CORE + 45, 2, text("10.255.0.4/30", 9, "#8250df")),
    (HQ + 290, Y_RTR + 8, 2, text("10.255.0.12/30 (backup)", 9, "#8250df")),
    (HQ + 40, Y_RTR + 85, 2, text("802.1Q trunk", 9, "#57606a", bold=False)),
    (DC + 40, Y_RTR + 85, 2, text("802.1Q trunk", 9, "#57606a", bold=False)),
    (BR + 40, Y_RTR + 85, 2, text("802.1Q trunk", 9, "#57606a", bold=False)),
    (HQ + 45, Y_DIST + 80, 2, text("2x trunk (STP)", 9, "#57606a", bold=False)),
    (DC + 45, Y_DIST + 80, 2, text("2x trunk (STP)", 9, "#57606a", bold=False)),
    (BR + 45, Y_DIST + 80, 2, text("2x trunk (STP)", 9, "#57606a", bold=False)),
    # host VLAN labels
    (HQ - 185, Y_HOST + 75, 2, text("VLAN 10 IT\n10.10.10.0/24", 9, "#1f6feb")),
    (HQ - 35, Y_HOST + 75, 2, text("VLAN 20 FINANCE\n10.10.20.0/24", 9, "#1f6feb")),
    (HQ + 115, Y_HOST + 75, 2, text("VLAN 30 GUEST\n10.10.30.0/24", 9, "#1f6feb")),
    (DC - 135, Y_HOST + 75, 2, text("VLAN 60 SERVERS\n10.30.60.10", 9, "#1a7f37")),
    (DC + 45, Y_HOST + 75, 2, text("VLAN 100 NETOPS\n10.30.100.10\nAnsible/Syslog", 9, "#1a7f37")),
    (BR - 125, Y_HOST + 75, 2, text("VLAN 40 SALES\n10.20.40.0/24", 9, "#bf5b04")),
    (BR + 40, Y_HOST + 75, 2, text("VLAN 50 OPS\n10.20.50.0/24", 9, "#bf5b04")),
]


def add_drawings(api, pid):
    for d in api.get(f"/projects/{pid}/drawings"):
        api.delete(f"/projects/{pid}/drawings/{d['drawing_id']}")
    count = 0
    for x, y, z, svg in DRAWINGS:
        for dy, s in (svg if isinstance(svg, list) else [(0, svg)]):
            api.post(f"/projects/{pid}/drawings", {"x": int(x), "y": int(y + dy), "z": z, "svg": s})
            count += 1
    print("drawings added:", count)


def place_labels(api, pid):
    """Put device names beside the icon (not on top of the vertical links)."""
    for n in api.get(f"/projects/{pid}/nodes"):
        lbl = dict(n["label"])
        if n["node_type"] == "dynamips":
            lbl.update(x=62, y=2, style="font-family: Arial;font-size: 10;font-weight: bold;fill: #000000;fill-opacity: 1.0;")
        elif n["node_type"] in ("vpcs", "docker"):
            lbl.update(x=-10, y=-18, style="font-family: Arial;font-size: 10;font-weight: bold;fill: #000000;fill-opacity: 1.0;")
        else:
            continue
        api.put(f"/projects/{pid}/nodes/{n['node_id']}", {"label": lbl})


def main():
    api = GNS3()
    existing = api.project(PROJECT)
    if existing and "--drawings" in sys.argv:
        add_drawings(api, existing["project_id"])
        place_labels(api, existing["project_id"])
        return
    if existing:
        if "--rebuild" not in sys.argv:
            sys.exit(f"Project {PROJECT} already exists ({existing['project_id']}); use --rebuild")
        api.post(f"/projects/{existing['project_id']}/close")
        api.delete(f"/projects/{existing['project_id']}")
    proj = api.post("/projects", {"name": PROJECT, "scene_width": 2400, "scene_height": 1400,
                                  "show_grid": False, "snap_to_grid": False, "auto_close": False})
    pid = proj["project_id"]
    print("project", pid)

    ids = {}
    for name, ntype, compute, x, y, symbol, props in NODES:
        body = {"name": name, "node_type": ntype, "compute_id": compute,
                "x": int(x - 30), "y": int(y - 25), "symbol": symbol, "properties": dict(props)}
        if ntype in ("vpcs", "docker"):
            body["console_type"] = "telnet"
        if ntype == "docker":
            body["properties"].pop("console_type", None)
        n = api.post(f"/projects/{pid}/nodes", body, timeout=900)
        ids[name] = n["node_id"]
        print(f"  node {name:13} {ntype:9} console={n.get('console')}")

    for a, aa, ap, b, ba, bp in LINKS:
        api.post(f"/projects/{pid}/links", {"nodes": [
            {"node_id": ids[a], "adapter_number": aa, "port_number": ap},
            {"node_id": ids[b], "adapter_number": ba, "port_number": bp}]})
        print(f"  link {a}[{aa}/{ap}] <-> {b}[{ba}/{bp}]")

    add_drawings(api, pid)
    place_labels(api, pid)


if __name__ == "__main__":
    t = time.time()
    main()
    print(f"done in {time.time() - t:.0f}s")
