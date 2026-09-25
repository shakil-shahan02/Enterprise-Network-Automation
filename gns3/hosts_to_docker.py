"""Replace the VPCS end hosts with Docker Linux hosts on the GNS3 VM.

Why: VPCS drops the unicast DHCPACK that Cisco IOS sends (it only accepts IP packets addressed
to its current address), so DHCP never completes. Alpine's udhcpc works with IOS, and an
nginx container gives the Data Centre a real web server to test the server-VLAN ACL against.
"""
import build_topology as bt
from gns3api import GNS3

HOSTS = {
    # name:      (image,            start_command, interfaces-file body)
    "PC-IT1":    ("alpine:3.20", "/bin/sh", "auto eth0\niface eth0 inet dhcp\n\thostname PC-IT1\n"),
    "PC-FIN1":   ("alpine:3.20", "/bin/sh", "auto eth0\niface eth0 inet dhcp\n\thostname PC-FIN1\n"),
    "PC-GUEST1": ("alpine:3.20", "/bin/sh", "auto eth0\niface eth0 inet dhcp\n\thostname PC-GUEST1\n"),
    "PC-SALES1": ("alpine:3.20", "/bin/sh", "auto eth0\niface eth0 inet dhcp\n\thostname PC-SALES1\n"),
    "PC-OPS1":   ("alpine:3.20", "/bin/sh", "auto eth0\niface eth0 inet dhcp\n\thostname PC-OPS1\n"),
    "SRV-WEB1":  ("nginx:alpine", "", "auto eth0\niface eth0 inet static\n\taddress 10.30.60.10\n"
                  "\tnetmask 255.255.255.0\n\tgateway 10.30.60.1\n"
                  "\tup echo nameserver 10.0.0.3 > /etc/resolv.conf\n"),
}

api = GNS3()
pid = api.project(bt.PROJECT)["project_id"]
nodes = api.nodes(pid)
links = api.get(f"/projects/{pid}/links")

for name, (image, cmd, ifaces) in HOSTS.items():
    old = nodes[name]
    peer = None
    for l in links:
        if old["node_id"] in [e["node_id"] for e in l["nodes"]]:
            peer = [e for e in l["nodes"] if e["node_id"] != old["node_id"]][0]
    api.delete(f"/projects/{pid}/nodes/{old['node_id']}")
    props = {"image": image, "adapters": 1, "start_command": cmd,
             "environment": f"PS1={name}:\\w# \nTZ=Australia/Sydney"}
    new = api.post(f"/projects/{pid}/nodes", {
        "name": name, "node_type": "docker", "compute_id": "vm", "console_type": "telnet",
        "x": old["x"], "y": old["y"], "symbol": old["symbol"], "label": old["label"],
        "properties": props}, timeout=900)
    api.post(f"/projects/{pid}/nodes/{new['node_id']}/files/etc/network/interfaces", ifaces.encode())
    api.post(f"/projects/{pid}/links", {"nodes": [
        {"node_id": new["node_id"], "adapter_number": 0, "port_number": 0},
        {"node_id": peer["node_id"], "adapter_number": peer["adapter_number"], "port_number": peer["port_number"]}]})
    api.post(f"/projects/{pid}/nodes/{new['node_id']}/start", timeout=300)
    print(f"{name}: docker {image} console {new['console_host']}:{new['console']}")
