"""Render Day-0/Part-A device configurations (configs/*.cfg) from the design data below.

Secrets are NOT stored here: the rendered configs contain __ADMIN_SECRET__ / __ENABLE_SECRET__ /
__OSPF_KEY__ placeholders that bootstrap.py substitutes from scripts/secrets.local.json (git-ignored).
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "configs")

DOMAIN = "corp.local"
NTP_SERVER = "10.0.0.4"      # R4-CORE loopback (NTP master stratum 3)
DNS_SERVER = "10.0.0.3"      # R3-DC loopback (IOS DNS server)
SYSLOG = "10.30.100.10"      # ANSIBLE-SRV (rsyslog / python syslog collector)
MGMT_NETS = [("10.30.100.0", "0.0.0.255", "NETOPS automation VLAN"),
             ("10.10.10.0", "0.0.0.255", "HQ IT VLAN")]

SITES = {
    "HQ": {"router": "R1-HQ", "loop": "10.0.0.1", "area": 10, "summary": ("10.10.0.0", "255.255.0.0"),
           "vlans": [(10, "IT", "10.10.10.1", True), (20, "FINANCE", "10.10.20.1", True),
                     (30, "GUEST", "10.10.30.1", True), (99, "MGMT", "10.10.99.1", False)],
           "dist": ("SW1-HQ-DIST", "10.10.99.11"), "acc": ("SW2-HQ-ACC", "10.10.99.12"),
           "access_ports": {5: (10, "PC-IT1"), 6: (20, "PC-FIN1"), 7: (30, "PC-GUEST1")}},
    "BR": {"router": "R2-BR", "loop": "10.0.0.2", "area": 20, "summary": ("10.20.0.0", "255.255.0.0"),
           "vlans": [(40, "SALES", "10.20.40.1", True), (50, "OPERATIONS", "10.20.50.1", True),
                     (99, "MGMT", "10.20.99.1", False)],
           "dist": ("SW3-BR-DIST", "10.20.99.11"), "acc": ("SW4-BR-ACC", "10.20.99.12"),
           "access_ports": {5: (40, "PC-SALES1"), 6: (50, "PC-OPS1")}},
    "DC": {"router": "R3-DC", "loop": "10.0.0.3", "area": 30, "summary": ("10.30.0.0", "255.255.0.0"),
           "vlans": [(60, "SERVERS", "10.30.60.1", False), (100, "NETOPS", "10.30.100.1", False),
                     (99, "MGMT", "10.30.99.1", False)],
           "dist": ("SW5-DC-DIST", "10.30.99.11"), "acc": ("SW6-DC-ACC", "10.30.99.12"),
           "access_ports": {5: (60, "SRV-WEB1"), 6: (100, "ANSIBLE-SRV")}},
}

# Point-to-point links (all OSPF area 0): (router, interface, ip, peer-description, cost)
P2P = {
    "R4-CORE": [("FastEthernet1/0", "10.255.0.1", "R1-HQ f1/0", 10),
                ("FastEthernet1/1", "10.255.0.5", "R2-BR f1/0", 10),
                ("FastEthernet2/0", "10.255.0.9", "R3-DC f1/0", 10)],
    "R1-HQ": [("FastEthernet1/0", "10.255.0.2", "R4-CORE f1/0", 10),
              ("FastEthernet1/1", "10.255.0.13", "R3-DC f1/1 (backup)", 100)],
    "R2-BR": [("FastEthernet1/0", "10.255.0.6", "R4-CORE f1/1", 10)],
    "R3-DC": [("FastEthernet1/0", "10.255.0.10", "R4-CORE f2/0", 10),
              ("FastEthernet1/1", "10.255.0.14", "R1-HQ f1/1 (backup)", 100)],
}
DNS_HOSTS = {"r1-hq": "10.0.0.1", "r2-br": "10.0.0.2", "r3-dc": "10.0.0.3", "r4-core": "10.0.0.4",
             "sw1-hq-dist": "10.10.99.11", "sw2-hq-acc": "10.10.99.12", "sw3-br-dist": "10.20.99.11",
             "sw4-br-acc": "10.20.99.12", "sw5-dc-dist": "10.30.99.11", "sw6-dc-acc": "10.30.99.12",
             "web": "10.30.60.10", "ansible": "10.30.100.10", "syslog": "10.30.100.10"}


def common(hostname, src_if):
    return f"""!
! ===== {hostname} : global / management plane =====
hostname {hostname}
service timestamps debug datetime msec localtime show-timezone
service timestamps log datetime msec localtime show-timezone
service password-encryption
enable secret __ENABLE_SECRET__
username netadmin privilege 15 secret __ADMIN_SECRET__
ip domain-name {DOMAIN}
ip name-server {DNS_SERVER}
clock timezone AEST 10
! --- SSH (v2 only, RSA 2048) ---
crypto key generate rsa general-keys modulus 2048
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
! --- management ACL: only NETOPS + HQ-IT may SSH to the device ---
ip access-list standard MGMT-ACCESS
""" + "".join(f" permit {n} {w}\n" for n, w, _ in MGMT_NETS) + f""" deny any log
exit
line con 0
 exec-timeout 0 0
 logging synchronous
 transport preferred none
exit
line vty 0 4
 access-class MGMT-ACCESS in
 exec-timeout 10 0
 login local
 transport input ssh
 transport preferred none
exit
! --- NTP / Syslog ---
ntp server {NTP_SERVER}
logging buffered 16384 informational
logging trap informational
logging source-interface {src_if}
logging host {SYSLOG}
"""


def router(site_key):
    s = SITES[site_key]
    name, area = s["router"], s["area"]
    c = common(name, "Loopback0")
    c += f"""!
! ===== interfaces =====
interface Loopback0
 description ROUTER-ID / MGMT
 ip address {s['loop']} 255.255.255.255
exit
interface FastEthernet0/0
 description TRUNK to {s['dist'][0]} f1/0 (router-on-a-stick)
 no ip address
 duplex full
 no shutdown
exit
"""
    for vid, vname, gw, _ in s["vlans"]:
        c += f"""interface FastEthernet0/0.{vid}
 description VLAN{vid}-{vname}
 encapsulation dot1Q {vid}
 ip address {gw} 255.255.255.0
exit
"""
    for intf, ip, desc, cost in P2P[name]:
        c += f"""interface {intf}
 description P2P to {desc}
 ip address {ip} 255.255.255.252
 ip ospf network point-to-point
 ip ospf cost {cost}
 ip ospf dead-interval 120
 ip ospf message-digest-key 1 md5 __OSPF_KEY__
 duplex full
 speed 100
 no shutdown
exit
"""
    # ----- OSPF -----
    c += f"""!
! ===== OSPF multi-area (this router is ABR for area {area}) =====
router ospf 1
 router-id {s['loop']}
 log-adjacency-changes
 auto-cost reference-bandwidth 1000
 area 0 authentication message-digest
 area {area} range {s['summary'][0]} {s['summary'][1]}
 passive-interface default
"""
    for intf, *_ in P2P[name]:
        c += f" no passive-interface {intf}\n"
    c += f" network {s['loop']} 0.0.0.0 area 0\n"
    for intf, ip, *_ in P2P[name]:
        net = ip.rsplit(".", 1)[0] + "." + str(int(ip.rsplit(".", 1)[1]) & ~3)
        c += f" network {net} 0.0.0.3 area 0\n"
    for vid, _, gw, _ in s["vlans"]:
        c += f" network {gw.rsplit('.', 1)[0]}.0 0.0.0.255 area {area}\n"
    c += "exit\n"
    # ----- DHCP -----
    pools = [v for v in s["vlans"] if v[3]]
    if pools:
        c += "!\n! ===== DHCP server =====\nservice dhcp\n"
        for vid, vname, gw, _ in pools:
            net = gw.rsplit(".", 1)[0]
            c += f"ip dhcp excluded-address {net}.1 {net}.20\n"
        for vid, vname, gw, _ in pools:
            net = gw.rsplit(".", 1)[0]
            c += f"""ip dhcp pool {site_key}-{vname}
 network {net}.0 255.255.255.0
 default-router {gw}
 dns-server {DNS_SERVER}
 domain-name {DOMAIN}
 lease 1
exit
"""
    # ----- site specific security / services -----
    if site_key == "HQ":
        c += """!
! ===== ACLs =====
! Guest VLAN: Internet only - no access to any internal 10.0.0.0/8 resource
ip access-list extended GUEST-IN
 remark allow DHCP and DNS, block internal networks, allow Internet
 permit udp any any eq bootps
 permit udp 10.10.30.0 0.0.0.255 host 10.0.0.3 eq domain
 permit icmp 10.10.30.0 0.0.0.255 host 10.10.30.1
 deny ip 10.10.30.0 0.0.0.255 10.0.0.0 0.255.255.255 log
 permit ip 10.10.30.0 0.0.0.255 any
exit
! Finance VLAN: only HQ-IT, NETOPS and the DC servers may reach Finance hosts
ip access-list extended FINANCE-PROTECT
 remark protect finance hosts from branch and guest users
 permit ip 10.10.10.0 0.0.0.255 10.10.20.0 0.0.0.255
 permit ip 10.30.0.0 0.0.255.255 10.10.20.0 0.0.0.255
 permit ip 10.0.0.0 0.0.0.255 10.10.20.0 0.0.0.255
 deny ip 10.20.0.0 0.0.255.255 10.10.20.0 0.0.0.255 log
 deny ip 10.10.30.0 0.0.0.255 10.10.20.0 0.0.0.255 log
 permit ip any any
exit
interface FastEthernet0/0.30
 ip access-group GUEST-IN in
exit
interface FastEthernet0/0.20
 ip access-group FINANCE-PROTECT out
exit
"""
    if site_key == "DC":
        c += "!\n! ===== DNS server for corp.local =====\nip dns server\nip domain-lookup\n"
        c += "".join(f"ip host {h}.{DOMAIN} {ip}\n" for h, ip in DNS_HOSTS.items())
        c += """! upstream resolver for Internet names (reached through R4-CORE PAT)
ip name-server 8.8.8.8
! Server VLAN protection: only web/DNS/ICMP/SSH from inside, everything else logged+dropped
ip access-list extended SERVERS-PROTECT
 remark allow web services, ICMP and management to server VLAN
 permit tcp 10.0.0.0 0.255.255.255 host 10.30.60.10 eq www
 permit tcp 10.0.0.0 0.255.255.255 host 10.30.60.10 eq 443
 permit icmp 10.0.0.0 0.255.255.255 10.30.60.0 0.0.0.255
 permit icmp any 10.30.60.0 0.0.0.255 echo-reply
 permit tcp 10.30.100.0 0.0.0.255 10.30.60.0 0.0.0.255 eq 22
 deny ip 10.10.30.0 0.0.0.255 any log
 permit ip 10.30.0.0 0.0.255.255 any
 deny ip any any log
exit
interface FastEthernet0/0.60
 ip access-group SERVERS-PROTECT out
exit
"""
    return c


def core():
    name = "R4-CORE"
    c = common(name, "Loopback0").replace(f"ntp server {NTP_SERVER}\n",
                                           "ntp master 3\n")
    c += """!
! ===== interfaces =====
interface Loopback0
 description ROUTER-ID / NTP-MASTER
 ip address 10.0.0.4 255.255.255.255
exit
interface FastEthernet0/0
 description INTERNET (GNS3 NAT cloud) - PAT outside
 ip address dhcp
 ip nat outside
 no shutdown
exit
"""
    for intf, ip, desc, cost in P2P[name]:
        c += f"""interface {intf}
 description P2P to {desc}
 ip address {ip} 255.255.255.252
 ip nat inside
 ip ospf network point-to-point
 ip ospf cost {cost}
 ip ospf dead-interval 120
 ip ospf message-digest-key 1 md5 __OSPF_KEY__
 duplex full
 speed 100
 no shutdown
exit
"""
    c += """!
! ===== NAT / PAT for all enterprise networks =====
no service config
ip access-list extended NAT-INSIDE
 remark do not translate internal-to-internal traffic
 deny ip 10.0.0.0 0.255.255.255 10.0.0.0 0.255.255.255
 permit ip 10.0.0.0 0.255.255.255 any
exit
ip nat inside source list NAT-INSIDE interface FastEthernet0/0 overload
!
! ===== OSPF area 0 backbone + default route injection =====
router ospf 1
 router-id 10.0.0.4
 log-adjacency-changes
 auto-cost reference-bandwidth 1000
 area 0 authentication message-digest
 passive-interface default
 no passive-interface FastEthernet1/0
 no passive-interface FastEthernet1/1
 no passive-interface FastEthernet2/0
 network 10.0.0.4 0.0.0.0 area 0
 network 10.255.0.0 0.0.0.3 area 0
 network 10.255.0.4 0.0.0.3 area 0
 network 10.255.0.8 0.0.0.3 area 0
 default-information originate always
exit
"""
    return c


def switch(site_key, role):
    s = SITES[site_key]
    name, mgmt_ip = s[role]
    gw = [v for v in s["vlans"] if v[0] == 99][0][2]
    vlan_db = "\n".join(f"vlan {vid} name {vname}" for vid, vname, *_ in s["vlans"])
    c = f"""!EXEC-BEGIN
vlan database
vtp transparent
{vlan_db}
apply
exit
!EXEC-END
""" + common(name, "Vlan99")
    c += f"""!
! ===== L2 switch behaviour (EtherSwitch NM-16ESW) =====
no ip routing
ip default-gateway {gw}
"""
    vids = [str(v[0]) for v in s["vlans"]]
    if role == "dist":
        c += "".join(f"spanning-tree vlan {v} priority 4096\n" for v in [1] + [int(x) for x in vids])
        c += f"""interface FastEthernet1/0
 description TRUNK to {s['router']} f0/0
 switchport mode trunk
 no shutdown
exit
"""
    peer = s["acc"][0] if role == "dist" else s["dist"][0]
    for p in (1, 2):
        c += f"""interface FastEthernet1/{p}
 description TRUNK to {peer} f1/{p}
 switchport mode trunk
 no shutdown
exit
"""
    used = {0, 1, 2}
    if role == "acc":
        for port, (vid, host) in s["access_ports"].items():
            used.add(port)
            c += f"""interface FastEthernet1/{port}
 description ACCESS {host} (VLAN {vid})
 switchport mode access
 switchport access vlan {vid}
 spanning-tree portfast
 no shutdown
exit
"""
    unused = [p for p in range(3, 16) if p not in used]
    c += "! --- shut unused ports (security) ---\n"
    for p in unused:
        c += f"interface FastEthernet1/{p}\n description UNUSED\n shutdown\nexit\n"
    c += f"""interface Vlan1
 no ip address
 shutdown
exit
interface Vlan99
 description MGMT
 ip address {mgmt_ip} 255.255.255.0
 no shutdown
exit
"""
    return c


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {"R4-CORE": core()}
    for k in SITES:
        files[SITES[k]["router"]] = router(k)
        files[SITES[k]["dist"][0]] = switch(k, "dist")
        files[SITES[k]["acc"][0]] = switch(k, "acc")
    for name, text in files.items():
        with open(os.path.join(OUT, f"{name}.cfg"), "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        print("wrote", name)


if __name__ == "__main__":
    main()
