# ENT-HYBRID-NET – Design Justification

## 1. Hierarchical three-layer model
| Layer | Devices | Function |
|---|---|---|
| Core / Internet edge | R4-CORE, INTERNET-NAT | High-speed transit between sites, Internet PAT, NTP master, default-route origination |
| Distribution | R1-HQ, R2-BR, R3-DC (OSPF ABRs) + SW1/SW3/SW5 | Inter-VLAN routing (router-on-a-stick), route summarisation, policy (ACLs), DHCP, STP root |
| Access | SW2/SW4/SW6 | End-host connectivity, VLAN assignment, PortFast, unused-port shutdown |

The Cisco hierarchical model separates functions so each layer can be scaled, secured and
troubleshot independently; failures stay contained inside a block and new sites are added by
attaching another distribution block to the core without redesign.

## 2. Routing – multi-area OSPF
* **Area 0** carries only loopbacks and /30 P2P links; each site is its own area (10/20/30).
* Each site router is an **ABR** that summarises its site with `area X range` → the core sees
  exactly three /16 inter-area routes, limiting SPF recalculation and LSA flooding.
* **MD5 authentication** on area 0 prevents rogue adjacencies; `passive-interface default` stops
  hellos toward user VLANs.
* `auto-cost reference-bandwidth 1000` gives meaningful costs; the R1–R3 link has cost 100 so it
  is a **backup** path HQ↔DC that only carries traffic if the core fails.
* R4 injects a default route (`default-information originate`) so every site reaches the Internet.

## 3. Switching – VLANs, trunks, STP
* Department VLANs (IT, Finance, Guest, Sales, Operations, Servers, NetOps) isolate broadcast
  domains and let security policy be applied per department at the gateway.
* Dedicated **VLAN 99 management** network per site for switch SVIs (out of user VLANs).
* **Dual 802.1Q trunks** between distribution and access switches; STP root priority 4096 on the
  distribution switch so the redundant uplink is deterministically blocked (loop-free redundancy).
* Access ports use PortFast; all unused ports are administratively shut down.

## 4. Network services
| Service | Where | Why |
|---|---|---|
| DHCP | R1-HQ, R2-BR (per-VLAN pools, .1-.20 excluded) | Local DHCP keeps sites working if the WAN fails |
| DNS | R3-DC `ip dns server` (corp.local records, forwards to 8.8.8.8) | Central name resolution in the Data Centre |
| NTP | R4-CORE `ntp master 3`, everyone else `ntp server 10.0.0.4` | Consistent timestamps for logs and change audit |
| Syslog | All devices → ANSIBLE-SRV 10.30.100.10 (UDP 514) | Central log collection / audit |
| NAT/PAT | R4-CORE, inside = P2P links, outside = Fa0/0 | Single Internet egress, private 10/8 addressing |

## 5. Security
* **SSH v2 only**, RSA 2048, local user with `secret` (type 5/8/9 hash), `service password-encryption`.
* **MGMT-ACCESS** ACL on all VTY lines – only NetOps (automation) and HQ-IT may manage devices.
* **GUEST-IN** – guests get DHCP/DNS/Internet only, never 10.0.0.0/8.
* **FINANCE-PROTECT** – branch and guest users cannot reach Finance hosts.
* **SERVERS-PROTECT** – only web (80/443), ICMP and NetOps SSH reach the server VLAN.
* Login brute-force protection (`login block-for`), legal banner, SNMPv3 authPriv, archive
  config-change logging, HTTP server disabled (applied by Ansible baseline role).

## 6. Automation server placement
ANSIBLE-SRV sits in the Data Centre NETOPS VLAN 100 – the only network (with HQ-IT) allowed by
MGMT-ACCESS – reaching every device's loopback / VLAN 99 SVI in-band over OSPF.
