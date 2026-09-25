// Condensed (~3,000-word) edition of the technical report. Full evidence stays in screenshots/.
const R = require("./build_report.js");
const { P, B, I, H1, H2, bullet, numbered, table, tableCaption, figure, shot, Paragraph, TextRun, AlignmentType, PageBreak } = R;
const path = require("path");
const { TableOfContents } = require("docx");

const fig = (prefix, caption, w = 6.0) => { const f = shot(prefix); return f ? figure(f, caption, w) : []; };

exports.build = () => {
  const c = [];
  // ---------------- title page
  c.push(new Paragraph({ spacing: { before: 2000 }, children: [] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "Enterprise Network Automation and", size: 48, bold: true, color: "1F3864" })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: "Hybrid-Cloud Infrastructure as Code", size: 48, bold: true, color: "1F3864" })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 },
    children: [new TextRun({ text: "Project ENT-HYBRID-NET: GNS3, Ansible, Git and Terraform on AWS", size: 28, color: "2E75B6" })] }));
  c.push(table([
    ["Item", "Details"],
    ["Unit", "[Unit code and name]"],
    ["Group", "[Group name / number]"],
    ["Members", "[Student name - ID]\n[Student name - ID]\n[Student name - ID]"],
    ["Lecturer", "[Name]"],
    ["Git repository", "https://github.com/shakil-shahan02/Enterprise-Network-Automation"],
    ["Date", "[dd/mm/yyyy]"],
  ], [2400, 6626], { size: 21 }));
  c.push(new Paragraph({ children: [new PageBreak()] }));
  c.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: "1F3864" })] }));
  c.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }));

  // ---------------- 1
  c.push(H1("1. Executive Summary"));
  c.push(P("A multinational enterprise engaged our team to replace manual, device-by-device administration with an automated, secure and repeatable hybrid-cloud platform. We delivered three outcomes. First, a hierarchical GNS3 network (ENT-HYBRID-NET) connecting Headquarters, a Branch Office and a Data Centre with 4 routers, 6 switches and a Linux automation server, providing VLANs, inter-VLAN routing, multi-area OSPF, DHCP, DNS, NTP, Syslog, SSH, ACLs and NAT. Second, an Ansible project that treats the network as code: YAML data and Jinja2 templates drive eight roles that back up, configure, harden, verify and audit all ten devices idempotently, with credentials protected by Ansible Vault. Third, Terraform code that provisions a secure two-AZ AWS VPC with a bastion host and a private EC2 instance; it was deployed, verified, destroyed and audited to confirm no ongoing cost. All work is version-controlled in Git."));
  c.push(P("Testing confirmed the design. Every OSPF adjacency reached the FULL state, hosts received addresses from DHCP and resolved internal and Internet names, and each security policy behaved as intended. The Ansible pipeline passed all verification checks, scored fourteen out of fourteen in the compliance audit on every device, and reported no changes on a second run. The AWS environment was built, reached through the bastion host and then removed without leaving any billable resources."));

  // ---------------- 2
  c.push(H1("2. Introduction"));
  c.push(P("Manual CLI administration causes inconsistent configurations, slow changes and weak audit trails. The objectives were to design a scalable and secure enterprise network (Part A), automate its configuration and validation with Ansible (Part B), and provision cloud infrastructure with Terraform stored in Git (Part C)."));
  c.push(P("The scope covered three on-premises sites and one AWS region. Headquarters hosts the IT, Finance and Guest departments; the Branch Office hosts Sales and Operations; the Data Centre hosts servers and the network-operations (NetOps) tools. The same engineering principles were applied throughout: define the desired state as code, keep it in Git, apply it automatically, and prove the result with repeatable tests. This report describes the design, the automation, the cloud deployment and the testing, then reflects on the challenges and on future improvements."));
  c.push(table([
    ["Component", "Version", "Role"],
    ["GNS3", "2.2.61 + GNS3 VM", "Network emulation; topology built through its REST API"],
    ["Routers", "Cisco 7200, IOS 15.0(1)M", "R1-HQ, R2-BR, R3-DC, R4-CORE"],
    ["Switches", "Cisco 2691 + NM-16ESW, IOS 12.4", "Three distribution and three access switches"],
    ["Automation server", "Debian container, ansible-core 2.17, cisco.ios 11.6", "Ansible control node and Syslog collector"],
    ["Terraform", "1.16.2, AWS provider 6.66", "AWS Infrastructure as Code"],
    ["Git / GitHub", "2.54", "Version control for all code and evidence"],
  ], [1900, 3200, 3926], { size: 18 }));
  c.push(tableCaption("Table 1: Tools and versions"));

  // ---------------- 3
  c.push(H1("3. Enterprise Network Design"));
  c.push(H2("3.1 Topology"));
  c.push(P("The network follows the three-layer hierarchical model (Figure 1). R4-CORE forms the core and Internet edge. The site routers R1-HQ, R2-BR and R3-DC, together with the distribution switches, form the distribution layer. Access switches connect end hosts. Each site is a separate block, so a new site can be attached to the core without redesign. The lab was created by a Python script using the GNS3 REST API, making the topology itself reproducible. End hosts are lightweight Linux containers, which provide real tools such as nslookup, wget and traceroute for testing. The Data Centre also contains an nginx web server so that the server-protection ACL could be tested with genuine HTTP traffic."));
  c.push(...fig("A01_", "GNS3 topology: core, distribution and access layers across three sites", 6.3));
  c.push(H2("3.2 IP addressing"));
  c.push(P("Each site owns a summarisable /16, loopbacks use 10.0.0.0/24 and point-to-point links use /30s from 10.255.0.0/24. The AWS VPC uses 172.20.0.0/16 so it never overlaps on-premises ranges."));
  c.push(table([
    ["Site", "VLAN", "Subnet", "Gateway", "Notes"],
    ["HQ", "10 IT", "10.10.10.0/24", "R1 Fa0/0.10", "DHCP; may manage devices"],
    ["HQ", "20 Finance", "10.10.20.0/24", "R1 Fa0/0.20", "DHCP; FINANCE-PROTECT ACL"],
    ["HQ", "30 Guest", "10.10.30.0/24", "R1 Fa0/0.30", "DHCP; Internet-only ACL"],
    ["Branch", "40 Sales / 50 Ops", "10.20.40-50.0/24", "R2 sub-interfaces", "DHCP"],
    ["DC", "60 Servers", "10.30.60.0/24", "R3 Fa0/0.60", "Web server 10.30.60.10"],
    ["DC", "100 NetOps", "10.30.100.0/24", "R3 Fa0/0.100", "Ansible and Syslog 10.30.100.10"],
    ["All", "99 Mgmt", "10.x0.99.0/24", "Site router", "Switch management SVIs"],
    ["Core", "-", "10.255.0.0/24 (/30s)", "-", "R4 to R1, R2, R3; R1-R3 backup"],
  ], [900, 1700, 2000, 1800, 2626], { size: 17 }));
  c.push(tableCaption("Table 2: VLAN and subnet plan"));
  c.push(H2("3.3 Configuration and justification"));
  [
    [B("VLANs and inter-VLAN routing: "), "department VLANs isolate broadcast domains; router-on-a-stick sub-interfaces give one policy point per site. Dual trunks with a fixed STP root provide loop-free redundancy."],
    [B("OSPF: "), "multi-area design with area 0 on the backbone and one area per site. ABRs summarise each site to a single /16, area 0 uses MD5 authentication, and the R1-R3 link (cost 100) is a backup path."],
    [B("Services: "), "per-site DHCP keeps branches working during WAN failure; R3-DC is the corp.local DNS server; R4 is the NTP master; every device logs to the NetOps Syslog collector."],
    [B("Security: "), "SSH v2 only with an ACL restricting management to the NetOps and IT VLANs; ACLs keep guests Internet-only, isolate Finance and protect servers; PAT on R4 provides a single controlled Internet exit."],
    [B("Why this design: "), "the hierarchical model keeps failure domains small and makes troubleshooting predictable, because each layer has a single job. OSPF is an open standard that converges quickly and scales through areas, so the core routing table holds only three site summaries instead of every subnet. Local DHCP and a central DNS server balance resilience with consistency. Placing the automation server in the Data Centre NetOps VLAN, the only network allowed to manage devices apart from HQ IT, follows the principle of least privilege for the management plane."],
  ].forEach(t => c.push(bullet(t)));
  c.push(P("Each service was configured with a clear purpose. DHCP pools on R1 and R2 exclude the first twenty addresses of every subnet for gateways and infrastructure, and hand out the default gateway, the corp.local domain and the DNS server address. R3-DC answers DNS queries for internal host names and forwards other queries to a public resolver through the NAT edge. R4-CORE acts as the NTP master for the whole enterprise, and every device sends informational Syslog messages, sourced from its loopback or management interface, to the collector on ANSIBLE-SRV. On the switches, unused ports are shut down and access ports use PortFast so hosts connect quickly without risking loops."));
  c.push(H2("3.4 Connectivity verification"));
  c.push(...fig("A02_", "R4-CORE: three FULL OSPF neighbours, site summaries and default route"));
  c.push(...fig("A07_", "SW1-HQ-DIST: VLAN database and 802.1Q trunks"));
  c.push(...fig("A08_", "SW2-HQ-ACC: redundant uplink blocked by spanning tree"));
  c.push(...fig("A10_", "PC-IT1: DHCP lease, DNS, inter-site and Internet reachability"));
  c.push(...fig("A11_", "PC-GUEST1: Internet allowed, internal networks blocked"));
  c.push(...fig("A12_", "PC-SALES1: web server reachable, Finance VLAN blocked"));
  c.push(...fig("A14_", "Central Syslog collector receiving messages from all devices"));

  // ---------------- 4
  c.push(H1("4. Network Automation with Ansible"));
  c.push(P("ANSIBLE-SRV (10.30.100.10) is the control node. It reaches every device over SSH using the network_cli connection. The inventory groups devices by role and by site; group and host variables form the single source of truth; secrets are encrypted with Ansible Vault."));
  c.push(P("The inventory places every device in two kinds of group. Role groups (core routers, site routers, distribution switches and access switches) decide which roles apply, while site groups (HQ, Branch, DC and Core) supply site data such as VLANs, DHCP pools and ACLs. Platform differences are handled in variables rather than in code, for example the older IOS 12.4 switches use DES for SNMPv3 privacy and a shorter change-logging command, so the same roles run unchanged on both router and switch images."));
  c.push(P("Each role follows the same pattern. Data in group_vars and host_vars describes what the network should look like, for example the VLAN list for a site or the point-to-point links of a router. Jinja2 templates render that data into Cisco configuration, and the cisco.ios modules compare it with the running configuration so that only differences are pushed. A handler saves the configuration to NVRAM only when something actually changed. The same YAML entry therefore feeds several devices at once: a VLAN definition creates the VLAN on both site switches, the router sub-interface, the DHCP pool and the OSPF network statement, which removes the risk of these drifting apart."));
  c.push(P("Security was built into the automation itself. Device credentials and SNMPv3 keys are held in an AES-256 Ansible Vault file whose password is never committed. The baseline role enforces SSH v2, login brute-force protection, a legal banner, remote logging and configuration-change archiving on every device. The compliance role then checks fourteen security rules against each running configuration and writes a report, so any drift from the standard is detected on the next run."));
  c.push(table([
    ["Playbook / role", "Purpose"],
    ["00 facts", "Discover devices and write an inventory CSV"],
    ["01 backup", "Timestamped running-config backups"],
    ["02 baseline", "Hardening, SSH, NTP, Syslog, DNS, SNMPv3, banner, change logging"],
    ["03 switching", "VLANs, trunks, access ports, STP root"],
    ["04 routing", "Sub-interfaces, P2P links, multi-area OSPF (Jinja2)"],
    ["05 services", "DHCP pools, DNS records, NAT (Jinja2)"],
    ["06 acl", "Data-driven, declarative ACLs"],
    ["07 verify / 08 compliance", "Automated assertions and a 14-rule security audit"],
  ], [2600, 6426], { size: 18 }));
  c.push(tableCaption("Table 3: Playbooks and roles"));
  c.push(...fig("B02_", "Ansible Vault: credentials encrypted with AES-256"));
  c.push(...fig("B04_", "Backup playbook saving all ten running configurations"));
  c.push(...fig("B10_", "Verification playbook: OSPF, routes, VLANs, trunks and reachability pass"));
  c.push(...fig("B12_", "Compliance audit: 14 of 14 rules pass on every device"));
  c.push(...fig("B13_", "Idempotency: second run of the whole pipeline reports changed=0"));
  c.push(P("The verification role asserts that every OSPF adjacency is FULL, that routers learn the default route, that each switch has its VLANs and trunks, and that devices can reach the Data Centre servers and the Internet. Because every check is an assertion, a broken network makes the playbook fail rather than silently succeed. The results are also written to a Markdown report that is committed to Git as evidence."));
  c.push(P("Backups and Git work together. The backup playbook saves a timestamped copy of every running configuration and keeps a latest copy per device in the repository, so any difference between two runs appears as a normal Git diff. Before committing, reversible type-7 strings are redacted, and a scan of the full history confirmed that no plain-text secret was ever pushed. This gives the team an auditable record of how the network changed over time."));
  c.push(H2("4.1 Day-2 change through Git"));
  c.push(P("To add VLAN 45 MARKETING at the Branch, we changed two lines of YAML and committed them to Git. A --check --diff dry run previewed the change, the pipeline applied it, and the devices confirmed the new VLAN, gateway sub-interface, DHCP pool and OSPF network. No CLI was typed by hand."));
  c.push(...fig("B14_", "Dry run predicts the change without touching devices"));
  c.push(...fig("B16_", "R2-BR after the change: new gateway, DHCP pool and OSPF interface"));
  c.push(H2("4.2 Infrastructure as Code discussion"));
  c.push(P("Infrastructure as Code manages infrastructure through versioned, machine-readable definitions rather than manual commands [5], [6]. Here the network's desired state lives in YAML, templates turn it into configuration, and Ansible makes devices match. Runs are idempotent, so they are safe to repeat and correct drift. Every change is a reviewed Git commit that can be rolled back, and the verify and compliance roles test the result automatically."));

  // ---------------- 5
  c.push(H1("5. AWS Infrastructure as Code with Terraform"));
  c.push(...figure(path.join(R.ROOT, "docs/aws_architecture.png"), "AWS architecture provisioned by Terraform", 6.0));
  c.push(P("Terraform creates a VPC (172.20.0.0/16) with two public and two private subnets across two Availability Zones, an Internet Gateway, public and private route tables, security groups, an ED25519 key pair, a bastion host in a public subnet and an Amazon Linux EC2 instance in a private subnet. The bastion accepts SSH only from the administrator's /32 address; the private server accepts SSH only from the bastion's security group. IMDSv2 and encrypted volumes are enforced, and state, keys and variable files are excluded from Git."));
  c.push(P("Terraform is declarative: it compares the configuration with its state and the real account, then plans the required actions [2]. Our workflow was init, fmt, validate, plan -out tfplan, apply tfplan, verification and destroy. The code was committed in stages (providers, network, security, compute, outputs) to show version control."));
  c.push(P("The code is organised by concern into versions.tf, variables.tf, network.tf, security.tf, compute.tf and outputs.tf. Input variables carry validation rules, for example refusing 0.0.0.0/0 as the administrator range, and default tags label every resource with the project and ManagedBy=Terraform. A NAT gateway is available through a variable but disabled by default to stay within the free tier, which is why the private server intentionally has no Internet access. The provider versions are pinned in the committed lock file so every engineer gets identical results."));
  c.push(P("The saved plan was applied, creating all 25 resources in about thirty seconds. The deployment was then checked independently with the AWS CLI and with a real SSH session through the bastion to the private server. Finally terraform destroy removed every resource, and an audit of all AWS regions confirmed that no instances, volumes, Elastic IPs, NAT gateways, custom VPCs, key pairs or snapshots remained, so the environment incurs no ongoing cost."));
  c.push(P("Security follows AWS Well-Architected guidance [4]. Only the bastion is reachable from the Internet, and only on port 22 from one address. The application server has no public IP and sits behind a security group that trusts the bastion group, not an IP range, so the rule stays correct if the bastion is replaced. The private key is generated by Terraform, written with restricted permissions and excluded from Git, and instance metadata requires session tokens, which blocks a common credential-theft technique."));
  c.push(...fig("C02_", "terraform plan: 25 resources to add"));
  c.push(...fig("C05_", "terraform apply: 25 resources created, with outputs"));
  c.push(...fig("C06_", "AWS CLI confirms VPC, subnets and running instances"));
  c.push(...fig("C08_", "SSH to the bastion and ProxyJump to the private server"));
  c.push(...fig("C10_", "After destroy: no billable resources in any region"));
  c.push(...fig("C03_", "Git commit history of the project"));

  // ---------------- 6
  c.push(H1("6. Testing"));
  c.push(P("Testing combined three methods. Device commands verified routing, switching and services directly on the routers and switches. End-host tests from the Linux containers checked what users actually experience: address assignment, name resolution, reachability and the effect of each ACL. Finally, the Ansible verify and compliance roles repeated the key checks automatically after every change. Table 4 summarises the results, and every test is backed by a screenshot in the evidence folder."));
  c.push(table([
    ["Test", "Result"],
    ["OSPF adjacencies and site summaries", "Pass"],
    ["Internet access through NAT", "Pass"],
    ["DHCP leasing and DNS resolution", "Pass"],
    ["Inter-site and inter-VLAN reachability", "Pass"],
    ["Guest, Finance and server ACLs", "Pass"],
    ["STP redundancy", "Pass"],
    ["SSH-only management and banner", "Pass"],
    ["Central Syslog collection", "Pass"],
    ["NTP", "Partial: reachable, sync prevented by emulator clock drift"],
    ["Ansible idempotency, verification and compliance", "Pass"],
    ["Day-2 change through Git", "Pass"],
    ["Terraform apply, AWS verification and bastion SSH", "Pass"],
    ["Terraform destroy and cost audit", "Pass"],
  ], [5200, 3826], { size: 18 }));
  c.push(tableCaption("Table 4: Test results"));

  // ---------------- 7
  c.push(H1("7. Discussion"));
  [
    [B("End hosts: "), "VPCS could not complete DHCP with Cisco IOS, so the PCs were replaced with small Linux containers, which also provided real test tools and a web server."],
    [B("Emulation limits: "), "VirtualBox ran the GNS3 VM through Hyper-V, causing periodic freezes; a recovery script restored the lab in minutes. Clock drift between emulated routers prevented NTP synchronisation, although the design and configuration were verified."],
    [B("Idempotency on real IOS: "), "IOS hides default commands and rewrites others, so roles were adjusted to push exactly what IOS stores. Afterwards repeated runs made no changes."],
    [B("Security of evidence: "), "secrets were kept in Vault and git-ignored files, and reversible type-7 strings were redacted from committed backups."],
    [B("Offline installation: "), "large downloads through the emulated Internet path timed out, so Ansible and its collections were installed from packages downloaded on the host. This mirrors how automation is deployed in air-gapped networks."],
    [B("Lessons learned: "), "automation made mistakes visible early. A malformed variable file was rejected before any device changed, and the dry-run mode let each change be reviewed before it was applied. Writing tests as part of the automation, rather than as a separate manual step, gave confidence that the network still worked after every run."],
    [B("Future work: "), "a CI/CD pipeline with linting, NetBox as the source of truth, a site-to-site VPN to the AWS VPC and remote Terraform state with locking."],
  ].forEach(t => c.push(bullet(t)));

  // ---------------- 8
  c.push(H1("8. Conclusion"));
  c.push(P("The project met its objectives. A hierarchical, secure network was built and verified; Ansible now manages it as code with idempotent, audited and version-controlled changes; and Terraform delivers a secure AWS environment that was deployed, tested and cleanly removed. Together these show the move from manual administration to automated, repeatable hybrid-cloud operations. The main limitations came from the emulated lab rather than the design, and the recommended next steps would bring the same practices into a continuous-delivery pipeline for production."));

  // ---------------- references
  c.push(H1("References"));
  [
    "[1] Red Hat, Inc., “Ansible cisco.ios collection documentation,” 2025. [Online]. Available: https://docs.ansible.com/ansible/latest/collections/cisco/ios/",
    "[2] HashiCorp, “Terraform language documentation,” 2025. [Online]. Available: https://developer.hashicorp.com/terraform/docs",
    "[3] Amazon Web Services, “Amazon VPC user guide,” 2025. [Online]. Available: https://docs.aws.amazon.com/vpc/",
    "[4] Amazon Web Services, “AWS Well-Architected Framework: Security pillar,” 2024.",
    "[5] K. Morris, Infrastructure as Code, 2nd ed. Sebastopol, CA, USA: O’Reilly, 2020.",
    "[6] M. Oswalt, C. Adell, S. S. Lowe and J. Edelman, Network Programmability and Automation, 2nd ed. Sebastopol, CA, USA: O’Reilly, 2023.",
    "[7] Cisco Systems, “IP routing: OSPF configuration guide, IOS 15M&T,” 2023.",
    "[8] NIST, “Security and privacy controls for information systems,” SP 800-53 Rev. 5, 2020.",
  ].forEach(t => c.push(P(t, { align: AlignmentType.LEFT })));

  // ---------------- appendix
  c.push(H1("Appendix: Submission Contents"));
  c.push(table([
    ["Item", "Folder"],
    ["Technical report", "01_Report"],
    ["GNS3 project", "02_GNS3_Project"],
    ["Configuration files", "03_Configuration_Files"],
    ["Ansible project", "04_Ansible_Project"],
    ["Terraform project", "05_Terraform_Project"],
    ["Git repository link", "06_Git_Repository_Link.txt"],
    ["Evidence screenshots", "07_Evidence_Screenshots"],
  ], [4000, 5026], { size: 18 }));
  return c;
};
