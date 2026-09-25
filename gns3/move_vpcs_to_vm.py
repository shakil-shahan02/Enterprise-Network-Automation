"""Re-create the VPCS hosts on the GNS3 VM compute (VPCS 0.8 - the Windows-bundled VPCS 0.6
does not complete DHCP with Cisco IOS because it ignores the unicast DHCPACK ARP)."""
import build_topology as bt
from gns3api import GNS3

api = GNS3()
pid = api.project(bt.PROJECT)["project_id"]
nodes = api.nodes(pid)
links = api.get(f"/projects/{pid}/links")
by_id = {n["node_id"]: name for name, n in nodes.items()}

for name, ntype, compute, x, y, symbol, props in bt.NODES:
    if ntype != "vpcs":
        continue
    old = nodes[name]
    # remember the switch side of the link
    peer = None
    for l in links:
        ids = [e["node_id"] for e in l["nodes"]]
        if old["node_id"] in ids:
            peer = [e for e in l["nodes"] if e["node_id"] != old["node_id"]][0]
    api.delete(f"/projects/{pid}/nodes/{old['node_id']}")
    new = api.post(f"/projects/{pid}/nodes", {
        "name": name, "node_type": "vpcs", "compute_id": "vm", "console_type": "telnet",
        "x": old["x"], "y": old["y"], "symbol": old["symbol"], "label": old["label"]})
    api.post(f"/projects/{pid}/links", {"nodes": [
        {"node_id": new["node_id"], "adapter_number": 0, "port_number": 0},
        {"node_id": peer["node_id"], "adapter_number": peer["adapter_number"], "port_number": peer["port_number"]}]})
    api.post(f"/projects/{pid}/nodes/{new['node_id']}/start")
    print(f"{name}: now on vm console {new['console_host']}:{new['console']} linked to {by_id[peer['node_id']]}")
