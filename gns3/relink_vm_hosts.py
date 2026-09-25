"""Repair cross-compute links after the GNS3 VM recovers from memory pressure.

Symptom: containers on the GNS3 VM can send (switch learns their MAC / ARP) but never receive
(DHCP fails, 'No route to host'). Deleting and re-creating the link allocates fresh UDP tunnel
ports on both computes and restores traffic in both directions.

  python relink_vm_hosts.py [NODE ...]      # default: every docker node
"""
import sys

from gns3api import GNS3

api = GNS3()
pid = api.project("ENT-HYBRID-NET")["project_id"]
nodes = api.nodes(pid)
wanted = set(sys.argv[1:]) or {n for n, d in nodes.items() if d["node_type"] == "docker"}
ids = {nodes[n]["node_id"]: n for n in wanted}

for link in api.get(f"/projects/{pid}/links"):
    ends = [e for e in link["nodes"] if e["node_id"] in ids]
    if not ends:
        continue
    eps = [{k: e[k] for k in ("node_id", "adapter_number", "port_number")} for e in link["nodes"]]
    api.delete(f"/projects/{pid}/links/{link['link_id']}")
    api.post(f"/projects/{pid}/links", {"nodes": eps})
    print(f"re-linked {ids[ends[0]['node_id']]}")
