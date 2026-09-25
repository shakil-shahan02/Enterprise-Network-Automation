# ENT-HYBRID-NET – IP Addressing Plan

Summarisable per-site /16 blocks allow each ABR to advertise one route into the backbone
(`area X range`), keeping the core routing table small.

| Block | Purpose |
|---|---|
| 10.0.0.0/24 | Router loopbacks (router-ID, management, NTP/DNS/Syslog source) |
| 10.10.0.0/16 | Headquarters (OSPF area 10) |
| 10.20.0.0/16 | Branch Office (OSPF area 20) |
| 10.30.0.0/16 | Data Centre (OSPF area 30) |
| 10.255.0.0/24 | Point-to-point WAN links /30 (OSPF area 0) |
| DHCP (192.168.42.0/24) | R4-CORE outside interface from GNS3 NAT (Internet) |
| 172.20.0.0/16 | AWS VPC (Part C) – non-overlapping with on-prem for future VPN |

## VLANs

| Site | VLAN | Name | Subnet | Gateway (router sub-if) | DHCP | Security |
|---|---|---|---|---|---|---|
| HQ | 10 | IT | 10.10.10.0/24 | 10.10.10.1 (R1 Fa0/0.10) | R1 pool HQ-IT (.21-.254) | Allowed to manage devices |
| HQ | 20 | FINANCE | 10.10.20.0/24 | 10.10.20.1 (R1 Fa0/0.20) | R1 pool HQ-FINANCE | ACL FINANCE-PROTECT (out) |
| HQ | 30 | GUEST | 10.10.30.0/24 | 10.10.30.1 (R1 Fa0/0.30) | R1 pool HQ-GUEST | ACL GUEST-IN (Internet only) |
| HQ | 99 | MGMT | 10.10.99.0/24 | 10.10.99.1 (R1 Fa0/0.99) | static | Switch SVIs |
| BR | 40 | SALES | 10.20.40.0/24 | 10.20.40.1 (R2 Fa0/0.40) | R2 pool BR-SALES | |
| BR | 50 | OPERATIONS | 10.20.50.0/24 | 10.20.50.1 (R2 Fa0/0.50) | R2 pool BR-OPERATIONS | |
| BR | 99 | MGMT | 10.20.99.0/24 | 10.20.99.1 (R2 Fa0/0.99) | static | Switch SVIs |
| DC | 60 | SERVERS | 10.30.60.0/24 | 10.30.60.1 (R3 Fa0/0.60) | static | ACL SERVERS-PROTECT (out) |
| DC | 100 | NETOPS | 10.30.100.0/24 | 10.30.100.1 (R3 Fa0/0.100) | static | Automation / Syslog server |
| DC | 99 | MGMT | 10.30.99.0/24 | 10.30.99.1 (R3 Fa0/0.99) | static | Switch SVIs |

## Device addressing

| Device | Interface | IP address | Connected to / role |
|---|---|---|---|
| R4-CORE | Lo0 | 10.0.0.4/32 | Router-ID, NTP master (stratum 3) |
| R4-CORE | Fa0/0 | DHCP 192.168.42.x/24 | INTERNET-NAT (ip nat outside) |
| R4-CORE | Fa1/0 | 10.255.0.1/30 | R1-HQ Fa1/0 |
| R4-CORE | Fa1/1 | 10.255.0.5/30 | R2-BR Fa1/0 |
| R4-CORE | Fa2/0 | 10.255.0.9/30 | R3-DC Fa1/0 |
| R1-HQ | Lo0 | 10.0.0.1/32 | Router-ID |
| R1-HQ | Fa1/0 | 10.255.0.2/30 | R4-CORE |
| R1-HQ | Fa1/1 | 10.255.0.13/30 | R3-DC (backup, OSPF cost 100) |
| R1-HQ | Fa0/0.10/.20/.30/.99 | .1 of each HQ VLAN | 802.1Q trunk to SW1-HQ-DIST |
| R2-BR | Lo0 | 10.0.0.2/32 | Router-ID |
| R2-BR | Fa1/0 | 10.255.0.6/30 | R4-CORE |
| R2-BR | Fa0/0.40/.50/.99 | .1 of each BR VLAN | 802.1Q trunk to SW3-BR-DIST |
| R3-DC | Lo0 | 10.0.0.3/32 | Router-ID, **DNS server** (corp.local) |
| R3-DC | Fa1/0 | 10.255.0.10/30 | R4-CORE |
| R3-DC | Fa1/1 | 10.255.0.14/30 | R1-HQ (backup) |
| R3-DC | Fa0/0.60/.100/.99 | .1 of each DC VLAN | 802.1Q trunk to SW5-DC-DIST |
| SW1-HQ-DIST | Vlan99 | 10.10.99.11/24 | STP root, gw 10.10.99.1 |
| SW2-HQ-ACC | Vlan99 | 10.10.99.12/24 | gw 10.10.99.1 |
| SW3-BR-DIST | Vlan99 | 10.20.99.11/24 | STP root |
| SW4-BR-ACC | Vlan99 | 10.20.99.12/24 | |
| SW5-DC-DIST | Vlan99 | 10.30.99.11/24 | STP root |
| SW6-DC-ACC | Vlan99 | 10.30.99.12/24 | |
| SRV-WEB1 (nginx) | eth0 | 10.30.60.10/24 | web.corp.local |
| ANSIBLE-SRV | eth0 | 10.30.100.10/24 | ansible.corp.local, syslog collector |
| PC-IT1 / PC-FIN1 / PC-GUEST1 | eth0 | DHCP | SW2-HQ-ACC Fa1/5-7 |
| PC-SALES1 / PC-OPS1 | eth0 | DHCP | SW4-BR-ACC Fa1/5-6 |
