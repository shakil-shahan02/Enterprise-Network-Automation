// Report text. Figures are embedded from ../screenshots and ../docs; code excerpts are read live from the repo.
const R = require("./build_report.js");
const { P, B, I, C, H1, H2, H3, bullet, numbered, table, tableCaption, figure, code, readLines, shot, figures,
  Paragraph, TextRun, AlignmentType, PageBreak } = R;
const fs = require("fs");
const path = require("path");
const { TableOfContents } = require("docx");

const fig = (prefix, caption, w) => { const f = shot(prefix); return f ? figure(f, caption, w) : [P([I(`[Evidence ${prefix} not captured]`)])]; };
const docFig = (file, caption, w) => figure(path.join(R.ROOT, file), caption, w);
const ev = (rel) => path.join(R.ROOT, rel);
const evLines = (rel, max = 60) => fs.existsSync(ev(rel)) ? fs.readFileSync(ev(rel), "utf8").split(/\r?\n/).slice(0, max) : [`(missing ${rel})`];

exports.build = () => {
  const c = [];
  // ------------------------------------------------------------------ title page
  c.push(new Paragraph({ spacing: { before: 2200 }, children: [] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "Enterprise Network Automation and", size: 48, bold: true, color: "1F3864" })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: "Hybrid-Cloud Infrastructure as Code", size: 48, bold: true, color: "1F3864" })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 },
    children: [new TextRun({ text: "Project ENT-HYBRID-NET — GNS3 · Ansible · Git · Terraform on AWS", size: 28, color: "2E75B6" })] }));
  c.push(table([
    ["Item", "Details"],
    ["Unit", "[Unit code and name]"],
    ["Assessment", "Group Project – Enterprise Network Design, Automation and Cloud IaC"],
    ["Group", "[Group name / number]"],
    ["Members", "[Student name – ID]\n[Student name – ID]\n[Student name – ID]"],
    ["Lecturer / Tutor", "[Name]"],
    ["Git repository", "https://github.com/shakil-shahan02/Enterprise-Network-Automation (private)"],
    ["Submission date", "[dd/mm/yyyy]"],
  ], [2600, 6426], { size: 21 }));
  c.push(new Paragraph({ children: [new PageBreak()] }));
  c.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: "1F3864" })] }));
  c.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }));
  c.push(P([I("Right-click the table and choose “Update Field” in Word to refresh page numbers.")]));

  // ------------------------------------------------------------------ 1 Executive summary
  c.push(H1("1. Executive Summary"));
  c.push(P("A multinational enterprise asked our consulting team to replace manual, device-by-device network administration with an automated, secure and repeatable hybrid-cloud platform. This report documents the complete solution we designed, built and tested."));
  c.push(P([B("On-premises network (Part A). "), "We built a new GNS3 lab, ENT-HYBRID-NET, using a three-layer hierarchical design (core / distribution / access) that links Headquarters, a Branch Office and a Data Centre. It contains 4 Cisco 7200 routers, 6 Cisco EtherSwitch (NM-16ESW) switches, 6 Linux end-hosts/servers and a Debian-based Linux automation server (ANSIBLE-SRV). The network provides VLAN segmentation, router-on-a-stick inter-VLAN routing, multi-area OSPF with MD5 authentication and ABR summarisation, per-site DHCP, a central DNS server, NTP, remote Syslog, SSH-only management, four security ACLs and Internet access through PAT."]));
  c.push(P([B("Automation (Part B). "), "The configuration is described once, as YAML data in an Ansible inventory, and deployed by eight Ansible roles: backup, baseline hardening, switching, routing, services, ACLs, verification and compliance. Credentials are protected with Ansible Vault. Every change is version-controlled in Git, previewed with check/diff mode, applied idempotently, then automatically verified and audited."]));
  c.push(P([B("Cloud (Part C). "), "Terraform code provisions an AWS VPC with two public and two private subnets across two Availability Zones, an Internet Gateway, route tables, least-privilege security groups, a bastion host, a private Amazon Linux EC2 instance and an ED25519 SSH key pair. The code was validated, planned, deployed to the team's AWS account (25 resources), verified with the AWS CLI and an SSH session through the bastion, and then destroyed; an all-region audit confirmed no billable resources remained. The Git history shows the code being built up one commit at a time."]));
  c.push(P("All functional tests passed: inter-site reachability, Internet access via NAT, DNS resolution, DHCP leasing, ACL enforcement, SSH-only management, Syslog collection, idempotent automation and a Git-driven Day-2 change. NTP is configured and every client reaches the NTP master, but emulator clock drift stops IOS from declaring synchronisation in the lab (see Section 7). The report closes with lessons learned and a roadmap: CI/CD pipelines, a source-of-truth (NetBox) and a site-to-site VPN to the AWS VPC."));

  // ------------------------------------------------------------------ 2 Introduction
  c.push(H1("2. Introduction"));
  c.push(H2("2.1 Scenario and objectives"));
  c.push(P("The client is moving from traditional CLI-driven administration to an automated hybrid-cloud environment. Manual configuration causes inconsistent device settings, slow change delivery, configuration drift and poor audit trails. The engagement objectives were:"));
  [ "Design and build a scalable, redundant, secure enterprise network for HQ, Branch and Data Centre (Part A).",
    "Automate configuration, backup, verification and compliance of every network device with Ansible (Part B).",
    "Provision secure AWS infrastructure with Terraform, stored and versioned in Git (Part C).",
    "Treat the network and cloud as code: declarative, reviewed, repeatable and testable.",
  ].forEach(t => c.push(bullet(t)));
  c.push(H2("2.2 Tools and platform"));
  c.push(table([
    ["Component", "Version / image", "Role in project"],
    ["GNS3 GUI + server", "2.2.61 (local server + GNS3 VM on VirtualBox 7.2)", "Network emulation, REST API used to build the topology"],
    ["Routers", "Cisco 7200 – IOS 15.0(1)M adventerprisek9", "R1-HQ, R2-BR, R3-DC, R4-CORE"],
    ["Switches", "Cisco 2691 + NM-16ESW – IOS 12.4(23)", "3 distribution + 3 access EtherSwitches"],
    ["Linux hosts", "Docker: alpine:3.20 (PCs), nginx:alpine (web server)", "DHCP clients, test endpoints, web server"],
    ["Automation server", "Docker: python:3.12-slim (Debian 13) + ansible-core 2.17.14", "Ansible control node, Syslog collector"],
    ["Ansible collections", "cisco.ios 11.6.0, ansible.netcommon 8.7.1, ansible.utils 6.1.1, ansible.posix 2.2.2", "Network modules (network_cli over SSH/paramiko)"],
    ["Terraform", "1.16.2, hashicorp/aws 6.66, tls 4.4, local 2.9", "AWS Infrastructure as Code"],
    ["Git", "2.54 + GitHub (private repository)", "Version control for all code, configs and evidence"],
    ["Host", "Windows 11, Intel i9-14900HX, 32 GB RAM", "Lab host"],
  ], [2000, 3600, 3426]));
  c.push(tableCaption("Table 1: Tools, versions and roles"));
  c.push(H2("2.3 Repository structure"));
  c.push(...code([
    "Enterprise-Network-Automation/",
    "├── gns3/        GNS3 REST client + topology builder (nodes, links, labels)",
    "├── configs/     Day-0 device configurations (rendered, secrets as placeholders)",
    "├── scripts/     config generator, console bootstrap, evidence tooling",
    "├── docs/        IP plan, design justification, AWS architecture diagram",
    "├── ansible/     ansible.cfg, inventory/ (source of truth), roles/, playbooks/, backups/, reports/",
    "├── terraform/   versions/variables/network/security/compute/outputs .tf",
    "├── evidence/    raw command outputs, Ansible run logs, terraform plan",
    "├── screenshots/ evidence screenshots used in this report",
    "└── report/      this report and its generator",
  ]));

  // ------------------------------------------------------------------ 3 Network design
  c.push(H1("3. Enterprise Network Design (Part A)"));
  c.push(H2("3.1 Topology"));
  c.push(P("Figure 1 shows the GNS3 topology, built from scratch with a Python script that calls the GNS3 REST API (gns3/build_topology.py). Because the whole lab is created as code, it can be rebuilt the same way every time. The layout follows the hierarchical model top to bottom: Internet edge and core, then the distribution layer (site routers and distribution switches), then the access layer (access switches and end hosts). Each site is drawn as its own coloured block, and every link is labelled with its subnet."));
  c.push(...fig("A01_", "ENT-HYBRID-NET GNS3 topology – hierarchical core / distribution / access design", 6.3));
  c.push(table([
    ["Layer", "Devices", "Functions"],
    ["Core / Internet edge", "R4-CORE, INTERNET-NAT", "Backbone transit (OSPF area 0), PAT to Internet, NTP master, default-route origination"],
    ["Distribution", "R1-HQ, R2-BR, R3-DC (ABRs)\nSW1-HQ-DIST, SW3-BR-DIST, SW5-DC-DIST", "Inter-VLAN routing, OSPF summarisation, ACL policy, DHCP, DNS (DC), STP root bridge"],
    ["Access", "SW2-HQ-ACC, SW4-BR-ACC, SW6-DC-ACC\nPCs, SRV-WEB1, ANSIBLE-SRV", "Host attachment, VLAN assignment, PortFast, unused ports shut down"],
  ], [1900, 3300, 3826]));
  c.push(tableCaption("Table 2: Hierarchical layers and device roles"));
  c.push(P("The minimum requirement of 4 routers, 6 switches and a Linux automation server is met: 4 × c7200 routers, 6 × c2691 EtherSwitch switches, and ANSIBLE-SRV (Debian 13 Linux container) in the Data Centre NETOPS VLAN."));

  c.push(H2("3.2 IP addressing plan"));
  c.push(P("Each site receives one summarisable /16 block, so each ABR advertises a single inter-area route into area 0. Loopbacks come from 10.0.0.0/24, and WAN links use /30s from 10.255.0.0/24. The AWS VPC uses 172.20.0.0/16 so it never overlaps the on-premises ranges, which leaves a future site-to-site VPN possible."));
  c.push(table([
    ["Site", "VLAN", "Name", "Subnet", "Gateway", "DHCP / notes"],
    ["HQ", "10", "IT", "10.10.10.0/24", "10.10.10.1 (R1 Fa0/0.10)", "Pool HQ-IT; may manage devices"],
    ["HQ", "20", "FINANCE", "10.10.20.0/24", "10.10.20.1 (R1 Fa0/0.20)", "Pool HQ-FINANCE; ACL FINANCE-PROTECT"],
    ["HQ", "30", "GUEST", "10.10.30.0/24", "10.10.30.1 (R1 Fa0/0.30)", "Pool HQ-GUEST; ACL GUEST-IN"],
    ["HQ", "99", "MGMT", "10.10.99.0/24", "10.10.99.1", "SW1 .11, SW2 .12 (static)"],
    ["Branch", "40", "SALES", "10.20.40.0/24", "10.20.40.1 (R2 Fa0/0.40)", "Pool BR-SALES"],
    ["Branch", "50", "OPERATIONS", "10.20.50.0/24", "10.20.50.1 (R2 Fa0/0.50)", "Pool BR-OPERATIONS"],
    ["Branch", "99", "MGMT", "10.20.99.0/24", "10.20.99.1", "SW3 .11, SW4 .12"],
    ["DC", "60", "SERVERS", "10.30.60.0/24", "10.30.60.1 (R3 Fa0/0.60)", "SRV-WEB1 10.30.60.10; ACL SERVERS-PROTECT"],
    ["DC", "100", "NETOPS", "10.30.100.0/24", "10.30.100.1 (R3 Fa0/0.100)", "ANSIBLE-SRV 10.30.100.10 (Syslog)"],
    ["DC", "99", "MGMT", "10.30.99.0/24", "10.30.99.1", "SW5 .11, SW6 .12"],
  ], [900, 700, 1200, 1500, 2300, 2426], { size: 17 }));
  c.push(tableCaption("Table 3: VLAN and subnet allocation"));
  c.push(table([
    ["Device", "Interface", "IP address", "Connected to / purpose"],
    ["R4-CORE", "Lo0 / Fa0/0", "10.0.0.4/32 / DHCP 192.168.42.x", "Router-ID + NTP master / INTERNET-NAT (NAT outside)"],
    ["R4-CORE", "Fa1/0 · Fa1/1 · Fa2/0", "10.255.0.1 · .5 · .9 /30", "R1-HQ · R2-BR · R3-DC (NAT inside, area 0)"],
    ["R1-HQ", "Lo0 · Fa1/0 · Fa1/1", "10.0.0.1 · 10.255.0.2 · 10.255.0.13", "Router-ID · R4 · R3 backup link (cost 100)"],
    ["R2-BR", "Lo0 · Fa1/0", "10.0.0.2 · 10.255.0.6", "Router-ID · R4"],
    ["R3-DC", "Lo0 · Fa1/0 · Fa1/1", "10.0.0.3 · 10.255.0.10 · 10.255.0.14", "Router-ID + DNS server · R4 · R1 backup"],
    ["R1/R2/R3", "Fa0/0.<vlan>", ".1 of each site VLAN", "802.1Q trunk to the distribution switch"],
    ["SW1 … SW6", "Vlan99", "10.x0.99.11 (dist) / .12 (acc)", "Management SVI, default gateway 10.x0.99.1"],
    ["ANSIBLE-SRV", "eth0", "10.30.100.10/24", "Automation + Syslog (ansible.corp.local)"],
    ["SRV-WEB1", "eth0", "10.30.60.10/24", "nginx web server (web.corp.local)"],
    ["PCs", "eth0", "DHCP", "PC-IT1, PC-FIN1, PC-GUEST1 (HQ) · PC-SALES1, PC-OPS1 (Branch)"],
  ], [1400, 1900, 2700, 3026], { size: 17 }));
  c.push(tableCaption("Table 4: Device interface addressing"));

  c.push(H2("3.3 Configuration of required services"));
  c.push(table([
    ["Requirement", "Implementation", "Devices"],
    ["VLANs", "VTP transparent; VLANs created in the NM-16ESW VLAN database; dual 802.1Q trunks dist↔access; STP root priority 4096 on distribution switch", "SW1–SW6"],
    ["Inter-VLAN routing", "Router-on-a-stick: dot1Q sub-interfaces Fa0/0.<vlan> on each site router", "R1, R2, R3"],
    ["OSPF", "Process 1, multi-area (0/10/20/30), ABR summarisation (area range), MD5 auth on area 0, passive-interface default, ref-bw 1000, default-information originate on R4", "R1–R4"],
    ["DHCP", "Per-VLAN pools with excluded .1–.20, default-router, DNS 10.0.0.3, domain corp.local", "R1, R2"],
    ["SSH", "SSH v2, RSA 2048, local user privilege 15 (secret), VTY transport input ssh + access-class MGMT-ACCESS", "All"],
    ["ACLs", "MGMT-ACCESS (VTY), GUEST-IN, FINANCE-PROTECT, SERVERS-PROTECT, NAT-INSIDE", "All / R1, R3, R4"],
    ["NAT", "PAT overload on R4 Fa0/0; NAT-INSIDE excludes internal-to-internal traffic", "R4"],
    ["DNS", "ip dns server + ip host records for corp.local, forwards to 8.8.8.8; clients use 10.0.0.3", "R3 (server), all (client)"],
    ["NTP", "R4 ntp master 3; all others ntp server 10.0.0.4; timezone AEST", "All"],
    ["Syslog", "logging host 10.30.100.10, trap informational, source Loopback0/Vlan99, buffered 16 KB", "All"],
  ], [1700, 5300, 2026], { size: 17 }));
  c.push(tableCaption("Table 5: Required services and how they are configured"));
  c.push(P("The full device configurations are in configs/*.cfg (Day-0, generated by scripts/gen_configs.py) and in ansible/backups/latest/*.cfg (the live running-configurations collected by Ansible). Key excerpts follow."));
  c.push(...code(readLines("configs/R1-HQ.cfg").filter(l => /^router ospf|^ router-id|^ area|^ network|^ passive|^ no passive|^ip dhcp pool HQ-IT|^ network 10.10.10|^ default-router 10.10.10|^ dns-server/.test(l)).slice(0, 22), "Excerpt – R1-HQ multi-area OSPF and DHCP (configs/R1-HQ.cfg)"));
  c.push(...code(readLines("configs/R4-CORE.cfg").filter(l => /nat|NAT|0\.255\.255\.255|ntp master|default-information/.test(l)), "Excerpt – R4-CORE NAT/PAT, NTP master, default route (configs/R4-CORE.cfg)"));
  c.push(...code(readLines("configs/SW2-HQ-ACC.cfg").slice(0, 10).concat(readLines("configs/SW2-HQ-ACC.cfg").filter(l => /FastEthernet1\/5|switchport|portfast/.test(l)).slice(0, 8)), "Excerpt – SW2-HQ-ACC VLAN database and access ports (configs/SW2-HQ-ACC.cfg)"));

  c.push(H2("3.4 Connectivity verification"));
  c.push(P("The following screenshots come from live device consoles. Each window is titled with the device, the feature being verified and a timestamp."));
  c.push(...fig("A02_", "R4-CORE – three FULL OSPF adjacencies, /16 inter-area summaries per site and the default route to the Internet"));
  c.push(...fig("A03_", "R1-HQ – router-on-a-stick sub-interfaces and DHCP bindings for HQ clients"));
  c.push(...fig("A04_", "R1-HQ – GUEST-IN, FINANCE-PROTECT and MGMT-ACCESS ACLs; OSPF interfaces in areas 0 and 10"));
  c.push(...fig("A05_", "R3-DC – DNS server records for corp.local and OSPF database summary"));
  c.push(...fig("A06_", "R2-BR – Branch router-on-a-stick sub-interfaces, DHCP bindings and OSPF adjacency to the core"));
  c.push(...fig("A07_", "SW1-HQ-DIST – VLAN database and 802.1Q trunks"));
  c.push(...fig("A08_", "SW2-HQ-ACC – spanning tree: redundant uplink Fa1/2 in BLK state (loop-free redundancy)"));
  c.push(...fig("A09_", "R1-HQ – SSH v2, NTP association to R4-CORE (reachable; peer flagged insane by emulator clock drift), remote Syslog and VTY hardening"));
  c.push(...fig("A10_", "PC-IT1 – DHCP lease, DNS resolution of web.corp.local, inter-site and Internet reachability, traceroute via the core"));
  c.push(...fig("A11_", "PC-GUEST1 – Internet and DNS allowed; internal servers and Finance blocked by GUEST-IN"));
  c.push(...fig("A12_", "PC-SALES1 – web server (HTTP) reachable, Finance VLAN blocked by FINANCE-PROTECT"));
  c.push(...fig("A13_", "R1-HQ – ACL hit counters after the tests prove the policy is enforced"));
  c.push(...fig("A14_", "ANSIBLE-SRV – central Syslog collector receiving messages from all network devices"));

  c.push(H2("3.5 Design justification"));
  [
    [B("Hierarchical model: "), "separating core, distribution and access functions keeps failure domains small, makes behaviour predictable and lets the design scale. A new site is simply another distribution block attached to the core."],
    [B("Multi-area OSPF: "), "an open standard that converges quickly. ABR summarisation shrinks the backbone table to three /16 routes and keeps site flaps out of the other areas' SPF runs. MD5 authentication blocks rogue neighbours, and passive-interface default stops hellos on user VLANs."],
    [B("Path redundancy: "), "the R1–R3 link (OSPF cost 100) is a backup HQ↔DC path. Dual trunks with a deterministic STP root give Layer 2 redundancy without loops."],
    [B("Router-on-a-stick: "), "suits the emulated EtherSwitch platform and centralises inter-VLAN policy (ACLs) at a single gateway per site."],
    [B("Local DHCP and central DNS: "), "each branch keeps working if the WAN fails, while name resolution stays consistent from one corp.local zone in the DC."],
    [B("Management plane: "), "SSH v2 only, with an ACL restricting management to the NetOps and IT VLANs. NTP gives consistent timestamps, and Syslog plus archive logging give a central audit trail."],
    [B("Segmentation and least privilege: "), "Guest users get Internet access only, Finance is isolated from branch and guest users, and the server VLAN admits only the services it needs."],
    [B("Single Internet edge with PAT: "), "private addressing internally, with one controlled, auditable egress point."],
  ].forEach(t => c.push(bullet(t)));

  // ------------------------------------------------------------------ 4 Ansible
  c.push(H1("4. Network Automation with Ansible (Part B)"));
  c.push(H2("4.1 Automation architecture"));
  c.push(P("ANSIBLE-SRV (10.30.100.10, NETOPS VLAN 100) is the Linux control node. It reaches every router loopback and switch management SVI in-band over OSPF, using SSH (network_cli with paramiko) and privilege escalation through enable. The Ansible project is stored in Git and mounted on the server at /root/ansible. The server also runs a small Python Syslog collector (tools/syslog_server.py) that receives logs from every device."));
  c.push(table([
    ["Element", "Implementation"],
    ["Inventory", "inventory/hosts.yml – groups by role (core_routers, site_routers, distribution_switches, access_switches) and by site (site_hq, site_branch, site_dc, site_core)"],
    ["Source of truth", "group_vars/all (standards: NTP, DNS, Syslog, banner, SNMPv3, mgmt ACL), group_vars/site_* (VLANs, ACLs, DNS records, NAT), host_vars/* (router-IDs, P2P links, trunks, access ports)"],
    ["Secrets", "group_vars/all/vault.yml encrypted with ansible-vault (AES-256); .vault_pass is git-ignored"],
    ["Roles", "backup, baseline, vlans, routing, services, acl, verify, compliance"],
    ["Templates", "Jinja2: interfaces.j2, ospf.j2, services.j2, report.md.j2, compliance.md.j2"],
    ["Playbooks", "00_facts_inventory … 08_compliance, site.yml (full pipeline)"],
    ["Outputs", "backups/ (timestamped + latest), reports/ (inventory CSV, verification, compliance), logs/ansible.log"],
  ], [2000, 7026], { size: 18 }));
  c.push(tableCaption("Table 6: Ansible project components"));
  c.push(...fig("B01_", "ANSIBLE-SRV control node: ansible-core version, installed collections and the role/site inventory graph"));

  c.push(H2("4.2 Playbooks and roles"));
  c.push(table([
    ["Playbook", "Role", "Target", "What it does"],
    ["00_facts_inventory.yml", "–", "all", "Gathers ios_facts; writes reports/device_inventory.csv"],
    ["01_backup.yml", "backup", "all", "Timestamped running-config backups + backups/latest for Git diff"],
    ["02_baseline.yml", "baseline", "all", "Hardening, local user, NTP, Syslog, DNS, archive logging, MGMT ACL, VTY, banner, SNMPv3"],
    ["03_switching.yml", "vlans", "switches", "Creates missing VLANs, trunks, access ports, STP root, VLAN 99 SVI"],
    ["04_routing.yml", "routing", "routers", "Loopbacks, sub-interfaces, P2P links, multi-area OSPF (Jinja2)"],
    ["05_services.yml", "services", "routers", "DHCP pools, DNS host records, NAT/PAT (Jinja2)"],
    ["06_security_acl.yml", "acl", "routers", "Data-driven extended ACLs + hit counters"],
    ["07_verify.yml", "verify", "all", "Asserts OSPF FULL, default route, VLANs, trunks, pings; writes verification report"],
    ["08_compliance.yml", "compliance", "all", "14 security rules checked by regex; writes compliance report"],
    ["site.yml", "all", "all", "Runs the whole pipeline in order"],
  ], [2200, 1200, 1100, 4526], { size: 17 }));
  c.push(tableCaption("Table 7: Playbooks and roles"));
  c.push(...code(readLines("ansible/inventory/group_vars/site_hq.yml", 0, 12), "Source of truth – ansible/inventory/group_vars/site_hq.yml (excerpt)"));
  c.push(...code(readLines("ansible/roles/routing/templates/ospf.j2"), "Jinja2 template – ansible/roles/routing/templates/ospf.j2"));
  c.push(...code(readLines("ansible/roles/vlans/tasks/main.yml", 0, 26), "Role task – ansible/roles/vlans/tasks/main.yml (idempotent VLAN creation)"));

  c.push(H2("4.3 Automation outputs"));
  c.push(...fig("B02_", "Ansible Vault – credentials encrypted with AES-256; only variable names are ever displayed"));
  c.push(...fig("B03_", "00_facts_inventory.yml – ios_facts discovery of all 10 devices and the generated inventory CSV"));
  c.push(...fig("B04_", "01_backup.yml – timestamped running-configuration backups plus a 'latest' copy per device for Git diffing"));
  c.push(...fig("B05_", "02_baseline.yml – hardening, SSH, NTP, Syslog, DNS, archive logging, SNMPv3 and banner enforced on all devices"));
  c.push(...fig("B06_", "03_switching.yml – VLAN database, 802.1Q trunks, access ports and STP root managed on the six switches"));
  c.push(...fig("B07_", "04_routing.yml – Jinja2-rendered sub-interfaces, P2P links and multi-area OSPF match the running network (changed=0)"));
  c.push(...fig("B08_", "05_services.yml – DHCP pools, DNS host records and NAT/PAT rendered from site data"));
  c.push(...fig("B09_", "06_security_acl.yml – declarative ACLs (whole block replaced only if the device differs) and live hit counters"));
  c.push(...fig("B10_", "07_verify.yml – automated assertions: OSPF FULL, default route, VLANs, trunks and reachability on every device"));
  c.push(...fig("B11_", "Verification report rendered by the verify role (reports/verification_report.md)"));
  c.push(...fig("B12_", "08_compliance.yml – 14 security rules audited on 10 devices: 14/14 on every device"));
  c.push(...fig("B13_", "Idempotency – the complete configuration pipeline (playbooks 02–06) re-run: changed=0, failed=0 on all 10 devices"));
  c.push(H3("Day-2 change delivered as code (CHG-0001: VLAN 45 MARKETING at the Branch)"));
  c.push(P("A realistic change request was implemented purely by editing the source of truth: two lines added to group_vars/site_branch.yml and committed to Git (Git evidence in Section 5.4). The same pipeline then dry-ran the change with --check --diff, applied it, and the result was verified on the devices. Because the data model links everything, the single VLAN entry produced the VLAN on both Branch switches, the STP root priority, the R2 router-on-a-stick sub-interface, the OSPF area 20 network statement and a new DHCP pool, with no hand-typed CLI."));
  c.push(...fig("B14_", "CHG-0001 dry run (--check --diff): Ansible predicts the changes (VLAN 45 would be created) without touching any device"));
  c.push(...fig("B15_", "CHG-0001 applied to the Branch devices (SW3-BR-DIST, SW4-BR-ACC, R2-BR) – failed=0"));
  c.push(...fig("B16_", "CHG-0001 verified on R2-BR: Fa0/0.45 gateway 10.20.45.1, DHCP pool BR-MARKETING, OSPF area 20"));
  c.push(...fig("B17_", "CHG-0001 verified on SW4-BR-ACC: VLAN 45 MARKETING present in the VLAN database and carried on the trunks"));
  c.push(...fig("B18_", "SSH v2 management by Ansible: legal banner from the baseline role and the live netadmin SSH session (aes128-cbc)"));  c.push(P([B("Generated reports. "), "The verification and compliance roles render Markdown reports into ansible/reports/, and those reports are committed to Git as evidence:"]));
  c.push(...code(evLines("ansible/reports/verification_report.md", 40), "ansible/reports/verification_report.md"));
  c.push(...code(evLines("ansible/reports/compliance_report.md", 30), "ansible/reports/compliance_report.md"));

  c.push(H2("4.4 Infrastructure as Code for the network"));
  c.push(P("Infrastructure as Code (IaC) means managing infrastructure through machine-readable definition files rather than interactive configuration, so the same engineering practices used for software apply to it: version control, peer review, testing and repeatable deployment [5], [6]. In this project the network's desired state is YAML data, templates turn that data into device configuration, and Ansible makes the devices match."));
  [
    [B("Declarative and idempotent: "), "running the full configuration pipeline a second time changes nothing (idempotency run in Section 4.3 – changed=0 on all ten devices). Ansible compares the desired lines with the running-configuration and pushes only the differences. That makes runs safe to repeat and lets the same playbook detect and correct configuration drift."],
    [B("Single source of truth: "), "a VLAN, ACL or DNS record is defined once. The same data feeds the switch VLAN database, the router sub-interface, the DHCP pool and the OSPF network statement, so these can no longer drift apart."],
    [B("Version control and review: "), "every change is a Git commit (Section 5.4). The Day-2 VLAN rollout was a four-line YAML change that could be reviewed, previewed with --check --diff, applied, verified and rolled back with git revert."],
    [B("Security: "), "secrets are encrypted with Ansible Vault and never committed in plain text; the compliance role continuously audits the security baseline."],
    [B("Speed and consistency: "), "the full pipeline configures and verifies all ten devices in minutes, whereas repeating the same work by hand at ten consoles is slow and error-prone."],
  ].forEach(t => c.push(bullet(t)));

  // ------------------------------------------------------------------ 5 Terraform
  c.push(H1("5. AWS Infrastructure as Code with Terraform (Part C)"));
  c.push(H2("5.1 Architecture"));
  c.push(...docFig("docs/aws_architecture.png", "AWS architecture provisioned by Terraform (ap-southeast-2)", 6.3));
  c.push(table([
    ["Requirement", "Terraform resource(s)", "Design notes"],
    ["One VPC", "aws_vpc.main (172.20.0.0/16)", "DNS support + hostnames; no overlap with on-prem 10/8"],
    ["Two public subnets", "aws_subnet.public[0..1]", "172.20.1.0/24, 172.20.2.0/24 in two AZs; public IP on launch"],
    ["Two private subnets", "aws_subnet.private[0..1]", "172.20.11.0/24, 172.20.12.0/24; no public IPs"],
    ["Internet Gateway", "aws_internet_gateway.igw", "Attached to the VPC"],
    ["Route tables", "aws_route_table.public / private + associations", "Public: 0.0.0.0/0 → IGW. Private: local only (optional NAT GW via variable)"],
    ["Security groups", "bastion-sg, app-sg + vpc_security_group_*_rule", "Bastion: SSH from admin /32 only. App: SSH only from bastion SG; HTTP/ICMP from VPC"],
    ["Bastion host", "aws_instance.bastion", "Amazon Linux 2023, t3.micro, public subnet A, IMDSv2, encrypted gp3"],
    ["EC2 Linux instance", "aws_instance.app", "Amazon Linux 2023, private subnet A, no public IP"],
    ["SSH key pair", "tls_private_key + aws_key_pair + local_sensitive_file", "ED25519 key generated by Terraform; private key saved 0600 and git-ignored"],
  ], [1800, 3000, 4226], { size: 17 }));
  c.push(tableCaption("Table 8: Mapping of Part C requirements to Terraform resources"));

  c.push(H2("5.2 Terraform code"));
  c.push(P("The code is split into files by concern: versions.tf, variables.tf, network.tf, security.tf, compute.tf and outputs.tf. Input variables have validation rules; for example, admin_cidr cannot be 0.0.0.0/0 and exactly two subnets of each tier are required. Default tags identify every resource as ManagedBy=Terraform. Nothing sensitive is committed: terraform.tfvars, the state file, the plan file and the generated private key are all excluded by .gitignore, and a terraform.tfvars.example template is provided instead."));
  c.push(...code(readLines("terraform/network.tf", 0, 44), "terraform/network.tf (excerpt)"));
  c.push(...code(readLines("terraform/security.tf", 0, 20), "terraform/security.tf (excerpt)"));

  c.push(H2("5.3 Terraform workflow and AWS deployment"));
  c.push(P("Terraform is declarative. The engineer describes the desired end state, and Terraform works out the create, update and delete actions needed by comparing the configuration with its state file and the real AWS resources [2]. The workflow used is:"));
  [
    [C("terraform init"), " – downloads the aws, tls and local providers and pins them in .terraform.lock.hcl (committed so every engineer uses identical provider versions)."],
    [C("terraform fmt"), " and ", C("terraform validate"), " – enforce canonical formatting and check syntax and references."],
    [C("terraform plan -out tfplan"), " – authenticates with the terraform-user IAM profile, reads the account (available AZs, latest AL2023 AMI) and prints an execution plan: 25 resources to add. The saved plan is what gets applied, so there are no surprises between review and deployment."],
    [C("terraform apply tfplan"), " – creates the resources in dependency order (VPC → subnets/IGW → route tables → SGs → key pair → instances) and prints the outputs, including a ready-made ProxyJump SSH command."],
    [C("terraform destroy"), " – removes everything, so lab costs stay at zero."],
  ].forEach(t => c.push(numbered(t)));
  c.push(P([B("Deployment. "), "The saved plan was applied to the team's AWS account (ap-southeast-2): all 25 resources were created in about 30 seconds (Terraform creates independent resources in parallel), and the outputs returned the bastion public IP, the private server IP and ready-made SSH commands. The deployment was then verified independently with the AWS CLI and with a real SSH session through the bastion. Finally it was destroyed, and an all-region audit confirmed the account contained no billable resources, keeping the lab cost at effectively zero."]));
  c.push(...fig("C01_", "terraform init / fmt / validate"));
  c.push(...fig("C02_", "terraform plan – 25 resources to add, with outputs"));
  c.push(...code(evLines("evidence/terraform/terraform_plan_summary.txt", 40), "Terraform plan – resource summary (evidence/terraform/terraform_plan_summary.txt)"));
  c.push(...fig("C05_", "terraform apply – 25 resources created in ap-southeast-2, followed by the Terraform outputs (VPC, subnets, IGW, bastion public IP, app private IP, SSH commands)"));
  c.push(...fig("C06_", "AWS CLI verification – VPC 172.20.0.0/16, two public + two private subnets across two AZs, bastion (public IP) and app server (no public IP) running"));
  c.push(...fig("C07_", "AWS CLI verification – public/private route tables (0.0.0.0/0 → IGW only on public), Internet gateway attached, security-group rules and ED25519 key pair"));
  c.push(...fig("C08_", "SSH to the bastion (Internet via IGW: HTTP 200) and ProxyJump to the private app server; the private server has no Internet path (no NAT gateway) and the bastion rejects ICMP – both as designed"));
  c.push(...fig("C09_", "terraform destroy – all 25 resources removed; Terraform state is empty"));
  c.push(...fig("C10_", "Independent post-destroy billing audit of all 17 AWS regions – 0 instances, volumes, Elastic IPs, NAT gateways, custom VPCs, key pairs or snapshots remain"));

  c.push(H2("5.4 Version control with Git"));
  c.push(P("All code, device configurations, backups, reports and evidence are held in one Git repository, pushed to a private GitHub repository. Commits are small and descriptive, following the build order: Part A topology and configs, then the Terraform code layer by layer (providers → network → security → compute → outputs), then the Ansible project and its generated backups and reports. The Day-2 VLAN change is its own commit, so the network change can be traced and reverted."));
  c.push(...fig("C03_", "Git commit history (git log --graph) demonstrating version control of the whole project"));
  c.push(...fig("C04_", "git show of the Day-2 change – a four-line YAML diff drives a multi-device network change"));

  // ------------------------------------------------------------------ 6 Testing
  c.push(H1("6. Testing"));
  c.push(P("Testing was done at three levels: manual verification from device consoles, end-host functional tests, and automated assertions in the Ansible verify and compliance roles, which are safe to repeat after every change."));
  c.push(table([
    ["#", "Test", "Expected result", "Result", "Evidence"],
    ["T1", "OSPF adjacencies core ↔ sites", "3 FULL neighbours on R4; 2 on R1/R3; 1 on R2", "PASS", "Fig. A02, A06, B10"],
    ["T2", "Route summarisation", "R4 sees 10.10/16, 10.20/16, 10.30/16 as O IA", "PASS", "Fig. A02"],
    ["T3", "Default route / NAT", "Hosts ping 8.8.8.8; NAT translations on R4", "PASS", "Fig. A10"],
    ["T4", "DHCP", "PCs receive address, gateway, DNS 10.0.0.3, domain corp.local", "PASS", "Fig. A03, A06, A10"],
    ["T5", "DNS", "web.corp.local → 10.30.60.10; google.com resolved via forwarder", "PASS", "Fig. A05, A10"],
    ["T6", "Inter-VLAN / inter-site", "PC-IT1 reaches web server and Branch PC", "PASS", "Fig. A10"],
    ["T7", "GUEST-IN ACL", "Guest reaches Internet; internal 10/8 blocked", "PASS", "Fig. A11, A13"],
    ["T8", "FINANCE-PROTECT ACL", "Branch cannot reach Finance; HTTP to web allowed", "PASS", "Fig. A12, A13"],
    ["T9", "STP redundancy", "One redundant uplink blocked per site", "PASS", "Fig. A08"],
    ["T10", "SSH / MGMT-ACCESS", "SSH v2 only; only NETOPS/IT can log in; banner shown", "PASS", "Fig. A09, B18"],
    ["T11", "NTP", "Clients associate with 10.0.0.4 and receive replies; synchronisation", "PARTIAL - config and reachability verified; sync blocked by Dynamips clock drift", "Fig. A09"],
    ["T12", "Syslog", "Collector receives messages from all devices", "PASS", "Fig. A14"],
    ["T13", "Ansible idempotency", "Second run of playbooks 02-06: changed=0", "PASS", "Fig. B13"],
    ["T14", "Automated verification", "All assertions pass on 10 devices", "PASS", "Fig. B10, B11"],
    ["T15", "Compliance audit", "14/14 rules on every device", "PASS", "Fig. B12"],
    ["T16", "Day-2 change (VLAN 45)", "Dry run predicts change; apply succeeds; VLAN/SVI/DHCP/OSPF present", "PASS", "Fig. B14-B17, C04"],
    ["T17", "Config backup", "10 running-configs saved and versioned", "PASS", "Fig. B04"],
    ["T18", "Terraform validate/plan", "Valid; 25 to add, 0 change, 0 destroy", "PASS", "Fig. C01, C02"],
    ["T19", "Terraform apply + outputs", "25 resources created; outputs returned", "PASS", "Fig. C05"],
    ["T20", "AWS resources correct", "VPC, 4 subnets/2 AZs, IGW, RTs, SGs, key pair, 2 EC2 as designed", "PASS", "Fig. C06, C07"],
    ["T21", "Bastion access model", "SSH to bastion from admin IP; ProxyJump to private EC2; private EC2 has no Internet", "PASS", "Fig. C08"],
    ["T22", "Teardown / cost control", "terraform destroy 25/25; 0 billable resources in all regions", "PASS", "Fig. C09, C10"],
  ], [500, 2100, 3526, 800, 2100], { size: 17 }));
  c.push(tableCaption("Table 9: Test plan and results"));

  // ------------------------------------------------------------------ 7 Discussion
  c.push(H1("7. Discussion"));
  c.push(H2("7.1 Challenges and how they were solved"));
  [
    [B("VPCS DHCP incompatibility. "), "VPCS never completed DHCP with Cisco IOS: it drops the DHCPACK that IOS unicasts to the offered address. Debugging with debug ip dhcp server packet showed the ACK leaving R1. We replaced the VPCS hosts with lightweight Docker Linux containers (Alpine udhcpc), which also gave us realistic tools (nslookup, wget, traceroute) and a real nginx web server for the ACL tests."],
    [B("Emulator CPU and timers. "), "A switch that was running while its idle-PC value was calculated never picked the value up and consumed a full CPU core. Emulation stalls caused OSPF dead-timer expiries. Restarting the node applied the idle-PC, and raising the backbone OSPF dead interval to 120 s (hello stays 10 s) stopped the flaps. Dynamips also runs each router's clock at a slightly different speed. Even after all clocks were set from the host, the NTP offset between R1 and R4 swung between −127 s and −2.5 s from one poll to the next, so IOS flags the master as 'insane' and will not synchronise. The NTP design and configuration are correct and verified (associations reachable); on physical routers, or with a stable hypervisor, they would synchronise normally."],
    [B("EtherSwitch VLAN database. "), "NM-16ESW modules keep VLANs in the legacy vlan database mode, which the cisco.ios resource modules do not support. The vlans role therefore parses show vlan-switch brief and creates only the missing VLANs through cli_command, which keeps the role idempotent."],
    [B("Legacy SSH algorithms. "), "IOS 12.4/15.0 offers only older key-exchange and cipher algorithms. Using the paramiko transport for network_cli kept compatibility without weakening the automation server's system-wide OpenSSH policy."],
    [B("Internet egress in the lab. "), "Large downloads through the emulated path (R3 → R4 PAT → GNS3 NAT) timed out, and the IOS DNS forwarder could not resolve the PyPI CDN names. Ansible was therefore installed offline: wheels and Galaxy collection tarballs were downloaded on the host and copied into the container (scripts/offline_install.py). This is the same pattern used in air-gapped production networks."],
    [B("Hypervisor instability. "), "The VirtualBox log showed the GNS3 VM running through Hyper-V (NEM: \"VT-x is not available\") because Windows virtualisation-based security is enabled. In this mode the VM froze roughly every 35 minutes. The team raised the GNS3 VM to 4 GB / 2 vCPU and wrote scripts/recover_lab.py (reset VM, re-open project, wait for OSPF, re-sync clocks), which cut recovery time to about five minutes. Disabling Hyper-V on the lab host is the permanent fix."],
    [B("Idempotency on real IOS. "), "The first baseline runs reported changes every time. IOS hides default settings (ip ssh authentication-retries 3, logging trap informational, exec-timeout 10 0, DHCP lease 1, no shutdown), rewrites some commands (logging host X is shown as logging X) and pads ACL keywords (deny   ip). The roles were corrected to push exactly what IOS stores, platform differences were moved into group variables (12.4 lacks 'notify syslog contenttype' and SNMPv3 AES), and ACLs became declarative blocks. After this, repeated runs report changed=0."],
    [B("Check mode safety. "), "cli_command (used for the legacy VLAN database) has no check mode, and the write-memory handler failed during --check. The role now reports the VLANs it would create, and handlers are skipped in check mode, so a dry run never writes NVRAM."],
    [B("Data-quality bug caught by automation. "), "A generated host_vars file for R2-BR had its single P2P link flattened into characters. Ansible stopped on the first invalid line ('interface F') before changing anything, showing why an automation pipeline must fail safely."],
    [B("Secrets in evidence. "), "Bootstrap logs and backups contained credentials or reversible type-7 strings. The team masked secrets in logs, redacted type-7 strings in the committed backups, and scanned every commit for secret values before pushing."],
  ].forEach(t => c.push(bullet(t)));
  c.push(H2("7.2 Security considerations"));
  c.push(P("Security is layered. The management plane is restricted to SSH v2 from two source VLANs, with login brute-force blocking, a legal banner, archive logging and SNMPv3 authPriv. The control plane uses OSPF MD5 authentication and passive interfaces. The data plane is segmented with VLANs and ACLs. In the cloud, the bastion is the only host with an inbound Internet rule, and only from one /32; the application server has no public IP and accepts SSH only from the bastion's security group. IMDSv2 and EBS encryption are enforced. Secrets never reach Git in plain text: Ansible Vault protects device credentials, and Terraform's private key, state and tfvars are git-ignored."));
  c.push(H2("7.3 Limitations and future work"));
  [
    "Add a CI/CD pipeline (GitHub Actions) that runs ansible-lint, yamllint, terraform fmt/validate/tflint and checkov on every pull request, and deploys on merge.",
    "Use NetBox as a dynamic inventory and source of truth, and pyATS/Batfish for pre-change validation.",
    "Connect the Data Centre to the AWS VPC with a site-to-site IPsec VPN (both address spaces were chosen not to overlap) and extend OSPF/BGP into the cloud.",
    "Move Terraform state to an encrypted S3 backend with state locking so the team can collaborate safely.",
    "Replace the emulated router-on-a-stick with Layer 3 distribution switches and HSRP for gateway redundancy on production hardware.",
  ].forEach(t => c.push(bullet(t)));

  // ------------------------------------------------------------------ 8 Conclusion
  c.push(H1("8. Conclusion"));
  c.push(P("The project met all three technical objectives. A hierarchical, redundant and segmented enterprise network was designed and built in GNS3, with every required service (VLANs, inter-VLAN routing, OSPF, DHCP, SSH, ACLs, NAT, DNS, NTP and Syslog) configured and verified end to end. The network is now managed as code: an Ansible project with a YAML source of truth, Jinja2 templates, eight roles and Vault-protected secrets backs up, configures, hardens, verifies and audits all ten devices idempotently, and a Day-2 change was delivered from a single reviewed Git commit. In the cloud, Terraform describes a secure two-AZ AWS VPC with a bastion-protected private EC2 instance, deployed to the live account, verified end to end, destroyed without leaving billable resources, and version-controlled in Git."));
  c.push(P("Together these show the shift the client asked for: from manual administration to automated, auditable and repeatable infrastructure delivery across on-premises and cloud environments."));

  // ------------------------------------------------------------------ References
  c.push(H1("References"));
  [
    "[1] Red Hat, Inc., “Ansible network automation: cisco.ios collection documentation,” Ansible Documentation, 2025. [Online]. Available: https://docs.ansible.com/ansible/latest/collections/cisco/ios/index.html",
    "[2] HashiCorp, “Terraform language documentation and core workflow,” HashiCorp Developer, 2025. [Online]. Available: https://developer.hashicorp.com/terraform/docs",
    "[3] Amazon Web Services, “Amazon Virtual Private Cloud user guide,” AWS Documentation, 2025. [Online]. Available: https://docs.aws.amazon.com/vpc/latest/userguide/",
    "[4] Amazon Web Services, “AWS Well-Architected Framework – Security pillar,” AWS Whitepaper, 2024. [Online]. Available: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/",
    "[5] K. Morris, Infrastructure as Code: Dynamic Systems for the Cloud Age, 2nd ed. Sebastopol, CA, USA: O’Reilly Media, 2020.",
    "[6] M. Oswalt, C. Adell, S. S. Lowe, and J. Edelman, Network Programmability and Automation, 2nd ed. Sebastopol, CA, USA: O’Reilly Media, 2023.",
    "[7] Cisco Systems, Inc., “IP routing: OSPF configuration guide, Cisco IOS release 15M&T,” Cisco, 2023. [Online]. Available: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/15-mt/iro-15-mt-book.html",
    "[8] Joint Task Force, “Security and privacy controls for information systems and organizations,” NIST, Gaithersburg, MD, USA, SP 800-53 Rev. 5, 2020, doi: 10.6028/NIST.SP.800-53r5.",
    "[9] GNS3 Technologies Inc., “GNS3 documentation and REST API,” 2024. [Online]. Available: https://docs.gns3.com/",
    "[10] S. Chacon and B. Straub, Pro Git, 2nd ed. Berkeley, CA, USA: Apress, 2014. [Online]. Available: https://git-scm.com/book",
  ].forEach(t => c.push(P(t, { align: AlignmentType.LEFT })));

  // ------------------------------------------------------------------ Appendix – evidence index
  c.push(H1("Appendix A – Submission Contents and Evidence Index"));
  c.push(table([
    ["Deliverable", "Location in repository"],
    ["Technical report", "report/ENT-HYBRID-NET_Technical_Report.docx"],
    ["GNS3 project", "ENT-HYBRID-NET.gns3project (portable export, 107 MB - submitted alongside the repository) + gns3/build_topology.py to rebuild it"],
    ["Configuration files", "configs/*.cfg (Day-0) and ansible/backups/latest/*.cfg (running configs)"],
    ["Ansible project", "ansible/"],
    ["Terraform project", "terraform/"],
    ["Git repository link", "https://github.com/shakil-shahan02/Enterprise-Network-Automation (private)"],
    ["Evidence screenshots", "screenshots/*.png (listed below)"],
  ], [3000, 6026], { size: 18 }));
  c.push(tableCaption("Table 10: Submission contents"));
  c.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
  // figure index is appended after all figures are known
  c.push({ __figureIndex: true });
  return c.flatMap(x => x && x.__figureIndex
    ? [table([["Figure", "Caption", "File"], ...figures.map(f => [f[0], f[1], f[2]])], [1000, 5226, 2800], { size: 16 })]
    : [x]);
};
