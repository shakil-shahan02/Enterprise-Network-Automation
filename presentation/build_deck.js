// ENT-HYBRID-NET presentation (3 presenters). NODE_PATH must point at pptxgenjs/react-icons/sharp/image-size.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const sizeOf = require("image-size");
const React = require("react");
const RDS = require("react-dom/server");
const fa = require("react-icons/fa");

const ROOT = path.resolve(__dirname, "..");
const IMG = path.join(ROOT, "report", "img");
const OUT = process.env.DECK_OUT || path.join(__dirname, "ENT-HYBRID-NET_Presentation.pptx");

const C = { navy: "0B1F3A", navy2: "132C52", teal: "0FA3B1", tealLt: "D9F3F5", amber: "F2A541",
  ink: "1E293B", muted: "64748B", card: "F1F5F9", white: "FFFFFF", green: "16A34A", red: "DC2626" };
const H = "Cambria", BODY = "Calibri";
const W = 13.333, HGT = 7.5;
const MEMBERS = {
  1: { name: "Member 1", topic: "Network Design (Part A)" },
  2: { name: "Member 2", topic: "Ansible Automation (Part B)" },
  3: { name: "Member 3", topic: "Terraform & AWS (Part C)" },
  0: { name: "All members", topic: "Team" },
};

async function icon(Comp, color, px = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: px }));
  const buf = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
const DECK_IMG = path.join(__dirname, ".img");
const CROP_W = { A01_: 0, A02_: 1750, A11_: 1750, B02_: 1900, B13_: 2250, B16_: 1900, C02_: 2000, C03_: 2800, C04_: 2300, C05_: 2250, C08_: 2650, C10_: 1950 };
async function prepShots() {
  fs.mkdirSync(DECK_IMG, { recursive: true });
  for (const [p, cw] of Object.entries(CROP_W)) {
    const f = fs.readdirSync(IMG).find(n => n.startsWith(p));
    const src = path.join(IMG, f), dst = path.join(DECK_IMG, f);
    const m = await sharp(src).metadata();
    const w = cw ? Math.min(cw, m.width) : m.width;
    await sharp(src).extract({ left: 0, top: 0, width: w, height: m.height }).png().toFile(dst);
  }
}
const shot = (prefix) => {
  const f = fs.readdirSync(DECK_IMG).find(n => n.startsWith(prefix));
  if (!f) throw new Error("missing screenshot " + prefix);
  return path.join(DECK_IMG, f);
};
// place an image inside a box, preserving aspect ratio (contain), centred
function imgFit(slide, file, x, y, w, h, opts = {}) {
  const d = sizeOf(fs.readFileSync(file));
  const r = Math.min(w / d.width, h / d.height);
  const iw = d.width * r, ih = d.height * r;
  const ix = x + (w - iw) / 2, iy = y + (opts.top ? 0 : (h - ih) / 2);
  slide.addImage({ path: file, x: ix, y: iy, w: iw, h: ih, altText: opts.alt || path.basename(file),
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.25 } });
  return { x: ix, y: iy, w: iw, h: ih };
}

(async () => {
  await prepShots();
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "ENT-HYBRID-NET - Enterprise Network Automation and Hybrid-Cloud IaC";

  const I = {
    net: await icon(fa.FaNetworkWired, C.white), robot: await icon(fa.FaRobot, C.white), cloud: await icon(fa.FaCloud, C.white),
    git: await icon(fa.FaGitAlt, C.white), shield: await icon(fa.FaShieldAlt, C.white), route: await icon(fa.FaRoute, C.white),
    server: await icon(fa.FaServer, C.white), check: await icon(fa.FaCheckCircle, C.white), lock: await icon(fa.FaLock, C.white),
    clock: await icon(fa.FaClock, C.white), list: await icon(fa.FaListAlt, C.white), dns: await icon(fa.FaGlobe, C.white),
    sitemap: await icon(fa.FaSitemap, C.white), code: await icon(fa.FaCode, C.white), sync: await icon(fa.FaSyncAlt, C.white),
    bug: await icon(fa.FaBug, C.white), dollar: await icon(fa.FaDollarSign, C.white), key: await icon(fa.FaKey, C.white),
    file: await icon(fa.FaFileAlt, C.white), users: await icon(fa.FaUsers, C.white), terminal: await icon(fa.FaTerminal, C.white),
    arrow: await icon(fa.FaArrowRight, C.teal),
  };

  const iconCircle = (s, data, x, y, d = 0.62, fill = C.teal) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
    s.addImage({ data, x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 });
  };
  const presenter = (s, m, dark = false) => {
    const t = MEMBERS[m];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: W - 3.55, y: 0.35, w: 3.2, h: 0.42, rectRadius: 0.21,
      fill: { color: dark ? C.navy2 : C.tealLt }, line: { color: dark ? C.navy2 : C.tealLt } });
    s.addText(`${t.name}  |  ${t.topic}`, { x: W - 3.55, y: 0.35, w: 3.2, h: 0.42, isTextBox: true, align: "center",
      valign: "middle", fontFace: BODY, fontSize: 11, bold: true, color: dark ? C.tealLt : C.navy, margin: 0 });
  };
  const title = (s, text, sub) => {
    s.addText(text, { x: 0.6, y: 0.3, w: W - 4.5, h: 0.8, isTextBox: true, fontFace: H, fontSize: 32, bold: true,
      color: C.navy, margin: 0, valign: "middle" });
    if (sub) s.addText(sub, { x: 0.6, y: 1.08, w: W - 1.2, h: 0.4, isTextBox: true, fontFace: BODY, fontSize: 15,
      italic: true, color: C.muted, margin: 0 });
  };
  const content = (m, t, sub) => { const s = pres.addSlide(); s.background = { color: C.white }; title(s, t, sub); presenter(s, m); return s; };
  const card = (s, x, y, w, h, fill = C.card) => s.addShape(pres.shapes.ROUNDED_RECTANGLE,
    { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill } });
  const caption = (s, text, x, y, w) => s.addText(text, { x, y, w, h: 0.3, isTextBox: true, fontFace: BODY,
    fontSize: 11, italic: true, color: C.muted, align: "center", margin: 0 });

  // ---------------------------------------------------------------- 1 title
  let s = pres.addSlide(); s.background = { color: C.navy };
  iconCircle(s, I.net, 0.8, 1.2, 0.9, C.teal);
  iconCircle(s, I.robot, 1.85, 1.2, 0.9, C.navy2);
  iconCircle(s, I.cloud, 2.9, 1.2, 0.9, C.amber);
  s.addText("Enterprise Network Automation\nand Hybrid-Cloud\nInfrastructure as Code", { x: 0.8, y: 2.3, w: 8.3, h: 2.3,
    isTextBox: true, fontFace: H, fontSize: 38, bold: true, color: C.white, margin: 0, valign: "top" });
  s.addText("Project ENT-HYBRID-NET  |  GNS3  ·  Ansible  ·  Git  ·  Terraform on AWS", { x: 0.8, y: 4.7, w: 8.3, h: 0.5,
    isTextBox: true, fontFace: BODY, fontSize: 18, color: C.tealLt, margin: 0 });
  [1, 2, 3].forEach((m, i) => {
    const x = 0.8 + i * 3.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.45, w: 3.6, h: 1.05, rectRadius: 0.12, fill: { color: C.navy2 }, line: { color: C.navy2 } });
    s.addText([{ text: `[${MEMBERS[m].name} name]`, options: { bold: true, fontSize: 16, color: C.white, breakLine: true } },
      { text: MEMBERS[m].topic, options: { fontSize: 12, color: C.tealLt } }],
      { x: x + 0.2, y: 5.5, w: 3.3, h: 0.95, isTextBox: true, fontFace: BODY, margin: 0, valign: "middle" });
  });
  [[9.6, 0.8, 3.2, C.teal, 55], [11.0, 2.6, 2.1, C.amber, 55], [9.5, 3.3, 1.5, C.tealLt, 65]].forEach(([x, y, d, col, t]) =>
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: col, transparency: t }, line: { color: col, transparency: t } }));
  s.addNotes("Member 1 opens: introduce the team, the client scenario and the three parts of the project.");

  // ---------------------------------------------------------------- 2 agenda
  s = content(0, "Agenda and presenters", "Three parts, one engineering approach: define it as code, keep it in Git, apply and verify automatically");
  const parts = [
    [1, I.net, "Part A  |  Enterprise network", ["Hierarchical GNS3 design", "IP plan, VLANs, OSPF", "Services & security", "Connectivity evidence"]],
    [2, I.robot, "Part B  |  Ansible automation", ["Source of truth + roles", "Vault-protected secrets", "Idempotency & compliance", "Day-2 change via Git"]],
    [3, I.cloud, "Part C  |  Terraform on AWS", ["VPC architecture", "Terraform workflow", "Deploy, verify, destroy", "Cost control & Git history"]],
  ];
  parts.forEach(([m, ic, head, items], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.8, 3.8, 4.6);
    iconCircle(s, ic, x + 0.3, 2.05, 0.7, [C.teal, C.navy, C.amber][i]);
    s.addText(MEMBERS[m].name, { x: x + 1.15, y: 2.05, w: 2.5, h: 0.35, isTextBox: true, fontFace: BODY, fontSize: 13, bold: true, color: C.teal, margin: 0 });
    s.addText(head, { x: x + 1.15, y: 2.38, w: 2.6, h: 0.4, isTextBox: true, fontFace: BODY, fontSize: 15, bold: true, color: C.navy, margin: 0 });
    s.addText(items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1 } })),
      { x: x + 0.3, y: 3.1, w: 3.3, h: 2.9, isTextBox: true, fontFace: BODY, fontSize: 15, color: C.ink, paraSpaceAfter: 10, margin: 0, valign: "top" });
  });
  s.addNotes("Member 1: walk through who presents which part. Closing slides are shared by the whole team.");

  // ---------------------------------------------------------------- 3 problem
  s = content(1, "The challenge", "A multinational enterprise moving from manual CLI administration to automated hybrid cloud");
  const prob = [[I.bug, "Inconsistent configs", "Each device configured by hand drifts from the standard"],
    [I.clock, "Slow change", "Every change typed on many consoles, one at a time"],
    [I.file, "Weak audit trail", "No record of who changed what, or why"]];
  prob.forEach(([ic, h, d], i) => {
    const y = 1.85 + i * 1.5;
    iconCircle(s, ic, 0.7, y, 0.75, C.red);
    s.addText(h, { x: 1.7, y, w: 4.6, h: 0.4, isTextBox: true, fontFace: BODY, fontSize: 18, bold: true, color: C.navy, margin: 0 });
    s.addText(d, { x: 1.7, y: y + 0.42, w: 4.6, h: 0.6, isTextBox: true, fontFace: BODY, fontSize: 14, color: C.muted, margin: 0 });
  });
  card(s, 6.9, 1.85, 5.8, 4.4, C.navy);
  s.addText("Objectives", { x: 7.25, y: 2.05, w: 5, h: 0.5, isTextBox: true, fontFace: H, fontSize: 22, bold: true, color: C.amber, margin: 0 });
  const obj = ["Design a scalable, secure network for HQ, Branch and Data Centre", "Automate configuration, backup, verification and compliance with Ansible",
    "Provision secure AWS infrastructure with Terraform", "Version-control everything in Git"];
  s.addText(obj.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < obj.length - 1 } })),
    { x: 7.25, y: 2.7, w: 5.2, h: 3.3, isTextBox: true, fontFace: BODY, fontSize: 16, color: C.white, paraSpaceAfter: 12, margin: 0, valign: "top" });
  s.addNotes("Member 1: explain why manual administration does not scale and list the four objectives.");

  // ---------------------------------------------------------------- 4 topology
  s = content(1, "Hierarchical network design", "Core / distribution / access across three sites - built from code through the GNS3 REST API");
  imgFit(s, shot("A01_"), 0.6, 1.65, 8.4, 5.3, { alt: "GNS3 topology" });
  const stats = [["4", "Cisco 7200 routers"], ["6", "EtherSwitch switches"], ["3", "sites + core"], ["1", "Linux automation server"]];
  stats.forEach(([n, l], i) => {
    const y = 1.75 + i * 1.3;
    s.addText(n, { x: 9.5, y, w: 1.1, h: 0.9, isTextBox: true, fontFace: H, fontSize: 48, bold: true, color: C.teal, margin: 0, valign: "middle" });
    s.addText(l, { x: 10.65, y, w: 2.2, h: 0.9, isTextBox: true, fontFace: BODY, fontSize: 15, color: C.ink, margin: 0, valign: "middle" });
  });
  s.addNotes("Member 1: core R4 connects the three site routers; each site has a distribution and an access switch. Redundant R1-R3 link and dual trunks give resilience.");

  // ---------------------------------------------------------------- 5 addressing
  s = content(1, "IP addressing and VLANs", "One summarisable /16 per site keeps the core routing table to three routes");
  const hdr = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.navy } } });
  const rows = [[hdr("Site"), hdr("VLAN"), hdr("Subnet"), hdr("Purpose")],
    ["HQ", "10 / 20 / 30", "10.10.x.0/24", "IT, Finance, Guest (DHCP)"],
    ["Branch", "40 / 50 / 45*", "10.20.x.0/24", "Sales, Operations, Marketing (DHCP)"],
    ["Data Centre", "60 / 100", "10.30.x.0/24", "Servers, NetOps (Ansible + Syslog)"],
    ["All sites", "99", "10.x0.99.0/24", "Switch management"],
    ["Core", "-", "10.255.0.0/24 (/30s)", "Point-to-point WAN links"],
    ["AWS", "-", "172.20.0.0/16", "VPC - no overlap with on-premises"]];
  s.addTable(rows, { x: 0.6, y: 1.75, w: 8.2, colW: [1.6, 1.6, 2.2, 2.8], fontFace: BODY, fontSize: 14, color: C.ink,
    border: { type: "solid", pt: 0.5, color: "CBD5E1" }, fill: { color: C.white }, rowH: 0.52, valign: "middle" });
  s.addText("* VLAN 45 was added later as a Day-2 change through Git", { x: 0.6, y: 5.6, w: 8.2, h: 0.35, isTextBox: true, fontFace: BODY, fontSize: 12, italic: true, color: C.muted, margin: 0 });
  card(s, 9.2, 1.75, 3.5, 4.2, C.tealLt);
  iconCircle(s, I.route, 9.5, 2.0, 0.7, C.teal);
  s.addText([{ text: "Multi-area OSPF", options: { bold: true, fontSize: 18, color: C.navy, breakLine: true } },
    { text: "Area 0 backbone, one area per site, ABR summarisation, MD5 authentication and a cost-100 backup link.", options: { fontSize: 14, color: C.ink } }],
    { x: 9.5, y: 2.85, w: 3.0, h: 2.9, isTextBox: true, fontFace: BODY, margin: 0, valign: "top", paraSpaceAfter: 8 });
  s.addNotes("Member 1: explain the addressing logic and why summarised areas make the design scalable.");

  // ---------------------------------------------------------------- 6 services & security
  s = content(1, "Services and security", "Every requirement configured, each with a clear purpose");
  const svc = [[I.sitemap, "VLANs & inter-VLAN", "Router-on-a-stick, dual trunks, STP root"], [I.route, "OSPF", "Multi-area, summarised, authenticated"],
    [I.server, "DHCP", "Local pools per site - survives WAN failure"], [I.dns, "DNS", "corp.local on R3-DC, forwards to Internet"],
    [I.clock, "NTP & Syslog", "R4 time source; central log collector"], [I.lock, "SSH", "SSH v2 only, VTY limited to NetOps/IT"],
    [I.shield, "ACLs", "Guest Internet-only, Finance & servers protected"], [I.cloud, "NAT", "Single PAT Internet edge on R4"]];
  svc.forEach(([ic, h, d], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.6 + col * 3.1, y = 1.8 + row * 2.45;
    card(s, x, y, 2.85, 2.2);
    iconCircle(s, ic, x + 0.25, y + 0.25, 0.62, row ? C.navy : C.teal);
    s.addText(h, { x: x + 0.25, y: y + 1.0, w: 2.4, h: 0.4, isTextBox: true, fontFace: BODY, fontSize: 16, bold: true, color: C.navy, margin: 0 });
    s.addText(d, { x: x + 0.25, y: y + 1.4, w: 2.45, h: 0.7, isTextBox: true, fontFace: BODY, fontSize: 13, color: C.muted, margin: 0, valign: "top" });
  });
  s.addNotes("Member 1: summarise how each required service was implemented and the security thinking behind the ACLs.");

  // ---------------------------------------------------------------- 7 verification
  s = content(1, "Connectivity verification", "Tested from the devices and from real end hosts");
  imgFit(s, shot("A02_"), 0.6, 1.65, 6.0, 4.6, { alt: "R4 OSPF" });
  caption(s, "R4-CORE: 3 FULL OSPF neighbours, site summaries, default route", 0.6, 6.4, 6.0);
  imgFit(s, shot("A11_"), 6.9, 1.65, 5.9, 4.6, { alt: "Guest ACL" });
  caption(s, "Guest PC: Internet allowed, internal networks blocked", 6.9, 6.4, 5.9);
  s.addNotes("Member 1: point out the FULL adjacencies and the ACL result; hand over to Member 2.");

  // ---------------------------------------------------------------- 8 ansible architecture
  s = content(2, "Automation architecture", "The network's desired state lives in Git; Ansible makes the devices match");
  const flow = [[I.git, "Git", "Reviewed commits"], [I.list, "YAML data", "Single source of truth"], [I.code, "Jinja2 roles", "Render IOS config"],
    [I.robot, "Ansible", "SSH to 10 devices"], [I.check, "Verify & audit", "Assertions + reports"]];
  flow.forEach(([ic, h, d], i) => {
    const x = 0.6 + i * 2.52;
    card(s, x, 2.0, 2.15, 2.4);
    iconCircle(s, ic, x + 0.72, 2.2, 0.72, i === 3 ? C.amber : C.teal);
    s.addText(h, { x: x + 0.1, y: 3.05, w: 1.95, h: 0.4, isTextBox: true, fontFace: BODY, fontSize: 16, bold: true, color: C.navy, align: "center", margin: 0 });
    s.addText(d, { x: x + 0.1, y: 3.45, w: 1.95, h: 0.7, isTextBox: true, fontFace: BODY, fontSize: 13, color: C.muted, align: "center", margin: 0, valign: "top" });
    if (i < flow.length - 1) s.addImage({ data: I.arrow, x: x + 2.19, y: 3.0, w: 0.3, h: 0.3 });
  });
  const facts = ["Control node: ANSIBLE-SRV in the Data Centre NetOps VLAN", "Inventory grouped by role (routers/switches) and by site (HQ/Branch/DC)",
    "Credentials encrypted with Ansible Vault (AES-256), never in Git"];
  s.addText(facts.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < facts.length - 1 } })),
    { x: 0.8, y: 4.85, w: 11.8, h: 1.7, isTextBox: true, fontFace: BODY, fontSize: 16, color: C.ink, paraSpaceAfter: 8, margin: 0, valign: "top" });
  s.addNotes("Member 2: explain the pipeline from a Git commit to verified devices.");

  // ---------------------------------------------------------------- 9 roles
  s = content(2, "Eight roles, ten playbooks", "One pipeline: back up, build, secure, verify, audit");
  const roles = [["backup", "Timestamped running-config backups"], ["baseline", "Hardening, SSH, NTP, Syslog, SNMPv3, banner"],
    ["vlans", "VLANs, trunks, access ports, STP"], ["routing", "Sub-interfaces, P2P links, OSPF"], ["services", "DHCP, DNS records, NAT"],
    ["acl", "Declarative security ACLs"], ["verify", "OSPF, routes, VLANs, reachability asserts"], ["compliance", "14 security rules per device"]];
  roles.forEach(([r, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.3, y = 1.75 + row * 1.2;
    card(s, x, y, 4.05, 1.0);
    s.addText(r, { x: x + 0.25, y: y + 0.12, w: 3.6, h: 0.35, isTextBox: true, fontFace: "Courier New", fontSize: 15, bold: true, color: C.teal, margin: 0 });
    s.addText(d, { x: x + 0.25, y: y + 0.5, w: 3.7, h: 0.4, isTextBox: true, fontFace: BODY, fontSize: 13, color: C.ink, margin: 0 });
  });
  imgFit(s, shot("B02_"), 9.3, 1.75, 3.5, 4.6, { alt: "Ansible Vault" });
  caption(s, "Vault: secrets encrypted, names only shown", 9.3, 6.45, 3.5);
  s.addNotes("Member 2: briefly describe each role; stress that secrets are encrypted.");

  // ---------------------------------------------------------------- 10 results
  s = content(2, "Automation results", "Proven by the pipeline's own output");
  const res = [["10 / 10", "devices configured and verified"], ["14 / 14", "compliance rules on every device"], ["0", "changes on a second run (idempotent)"], ["0", "failures across all playbooks"]];
  res.forEach(([n, l], i) => {
    const y = 1.75 + i * 1.22;
    card(s, 0.6, y, 4.9, 1.05, i < 2 ? C.tealLt : C.card);
    s.addText(n, { x: 0.8, y, w: 1.9, h: 1.05, isTextBox: true, fontFace: H, fontSize: 34, bold: true, color: C.navy, margin: 0, valign: "middle" });
    s.addText(l, { x: 2.7, y, w: 2.7, h: 1.05, isTextBox: true, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, valign: "middle" });
  });
  imgFit(s, shot("B13_"), 5.9, 1.75, 6.9, 4.7, { alt: "Idempotency run" });
  caption(s, "Full configuration pipeline re-run: changed=0, failed=0 on all 10 devices", 5.9, 6.5, 6.9);
  s.addNotes("Member 2: idempotency means the automation is safe to re-run and corrects drift.");

  // ---------------------------------------------------------------- 11 day-2
  s = content(2, "Day-2 change delivered as code", "Adding VLAN 45 MARKETING at the Branch - no CLI typed by hand");
  const steps = [["1", "Edit YAML", "2 lines in site_branch.yml"], ["2", "Git commit", "CHG-0001 reviewed"], ["3", "Dry run", "--check --diff preview"], ["4", "Apply", "Switches, router, DHCP, OSPF"], ["5", "Verify", "Devices confirm change"]];
  steps.forEach(([n, h, d], i) => {
    const x = 0.6 + i * 2.5;
    s.addShape(pres.shapes.OVAL, { x, y: 1.75, w: 0.6, h: 0.6, fill: { color: i === 3 ? C.amber : C.teal }, line: { color: i === 3 ? C.amber : C.teal } });
    s.addText(n, { x, y: 1.75, w: 0.6, h: 0.6, isTextBox: true, fontFace: H, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(h, { x: x + 0.7, y: 1.72, w: 1.7, h: 0.35, isTextBox: true, fontFace: BODY, fontSize: 15, bold: true, color: C.navy, margin: 0 });
    s.addText(d, { x: x + 0.7, y: 2.05, w: 1.75, h: 0.55, isTextBox: true, fontFace: BODY, fontSize: 12, color: C.muted, margin: 0, valign: "top" });
  });
  imgFit(s, shot("C04_"), 0.6, 2.9, 6.0, 3.6, { alt: "Git change" });
  caption(s, "The whole change is a two-line Git diff", 0.6, 6.6, 6.0);
  imgFit(s, shot("B16_"), 6.9, 2.9, 5.9, 3.6, { alt: "R2 after change" });
  caption(s, "R2-BR after the change: gateway, DHCP pool, OSPF area 20", 6.9, 6.6, 5.9);
  s.addNotes("Member 2: one YAML entry drove changes on three devices; hand over to Member 3.");

  // ---------------------------------------------------------------- 12 aws architecture
  s = content(3, "AWS architecture", "Secure two-AZ VPC defined entirely in Terraform");
  imgFit(s, path.join(ROOT, "docs", "aws_architecture.png"), 0.6, 1.65, 8.0, 5.2, { alt: "AWS architecture" });
  const aws = [[I.sitemap, "VPC 172.20.0.0/16", "2 public + 2 private subnets in 2 AZs"], [I.server, "Bastion + private EC2", "Only the bastion faces the Internet"],
    [I.shield, "Security groups", "SSH from admin /32 → bastion → app"], [I.key, "ED25519 key pair", "Generated by Terraform, never in Git"]];
  aws.forEach(([ic, h, d], i) => {
    const y = 1.75 + i * 1.28;
    iconCircle(s, ic, 8.95, y, 0.62, i % 2 ? C.navy : C.amber);
    s.addText(h, { x: 9.75, y: y - 0.02, w: 3.1, h: 0.35, isTextBox: true, fontFace: BODY, fontSize: 15, bold: true, color: C.navy, margin: 0 });
    s.addText(d, { x: 9.75, y: y + 0.33, w: 3.1, h: 0.6, isTextBox: true, fontFace: BODY, fontSize: 12, color: C.muted, margin: 0, valign: "top" });
  });
  s.addNotes("Member 3: explain the network layout and the bastion access model.");

  // ---------------------------------------------------------------- 13 workflow
  s = content(3, "Terraform workflow", "Declarative: describe the end state, Terraform plans the changes");
  const wf = ["init", "validate", "plan", "apply", "verify", "destroy"];
  wf.forEach((t, i) => {
    const x = 0.6 + i * 2.08;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.8, w: 1.8, h: 0.75, rectRadius: 0.37,
      fill: { color: i === 3 ? C.amber : i === 5 ? C.navy : C.teal }, line: { color: C.white } });
    s.addText(t, { x, y: 1.8, w: 1.8, h: 0.75, isTextBox: true, fontFace: "Courier New", fontSize: 15, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  });
  const big = [["25", "resources created"], ["~30 s", "to deploy"], ["6", "staged Git commits"]];
  big.forEach(([n, l], i) => {
    const x = 0.6 + i * 2.2;
    s.addText(n, { x, y: 3.1, w: 2.1, h: 0.9, isTextBox: true, fontFace: H, fontSize: 40, bold: true, color: C.teal, margin: 0 });
    s.addText(l, { x, y: 3.95, w: 2.1, h: 0.4, isTextBox: true, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0 });
  });
  const tfp = ["Code split by concern: versions, variables, network, security, compute, outputs", "Variables validated (admin CIDR can never be 0.0.0.0/0)",
    "State, keys and variable files excluded from Git; provider versions pinned"];
  s.addText(tfp.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < tfp.length - 1 } })),
    { x: 0.6, y: 4.7, w: 6.4, h: 2.0, isTextBox: true, fontFace: BODY, fontSize: 15, color: C.ink, paraSpaceAfter: 8, margin: 0, valign: "top" });
  imgFit(s, shot("C02_"), 7.3, 3.0, 5.5, 3.7, { alt: "terraform plan" });
  s.addNotes("Member 3: walk through each command and why the plan is saved before apply.");

  // ---------------------------------------------------------------- 14 deployment
  s = content(3, "Deployment evidence", "Applied to AWS, then verified independently");
  imgFit(s, shot("C05_"), 0.6, 1.65, 6.0, 4.6, { alt: "terraform apply" });
  caption(s, "terraform apply: 25 resources and outputs", 0.6, 6.4, 6.0);
  imgFit(s, shot("C08_"), 6.9, 1.65, 5.9, 4.6, { alt: "SSH ProxyJump" });
  caption(s, "SSH to bastion, then ProxyJump to the private server", 6.9, 6.4, 5.9);
  s.addNotes("Member 3: the private server has no Internet path by design; access only through the bastion.");

  // ---------------------------------------------------------------- 15 cost + git
  s = content(3, "Clean teardown and version control", "No ongoing cloud cost; full history in Git");
  imgFit(s, shot("C10_"), 0.6, 1.65, 6.0, 4.6, { alt: "cost audit" });
  caption(s, "After destroy: 0 billable resources in all 17 regions", 0.6, 6.4, 6.0);
  imgFit(s, shot("C03_"), 6.9, 1.65, 5.9, 4.6, { alt: "git history" });
  caption(s, "Git history: small, descriptive commits for every part", 6.9, 6.4, 5.9);
  s.addNotes("Member 3: terraform destroy removed all 25 resources and an all-region audit confirmed nothing is left.");

  // ---------------------------------------------------------------- 16 challenges
  s = content(0, "Challenges and lessons learned", "Real problems we solved along the way");
  const ch = [[I.bug, "VPCS DHCP failure", "Replaced test PCs with Linux containers"], [I.sync, "Emulator freezes & drift", "Recovery script; NTP limited by clock drift"],
    [I.code, "IOS idempotency", "Push exactly what IOS stores"], [I.lock, "Secrets in evidence", "Vault, git-ignored files, redaction"]];
  ch.forEach(([ic, h, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.2, y = 1.8 + row * 1.9;
    card(s, x, y, 5.9, 1.6);
    iconCircle(s, ic, x + 0.3, y + 0.45, 0.7, [C.red, C.amber, C.teal, C.navy][i]);
    s.addText(h, { x: x + 1.25, y: y + 0.3, w: 4.4, h: 0.45, isTextBox: true, fontFace: BODY, fontSize: 17, bold: true, color: C.navy, margin: 0 });
    s.addText(d, { x: x + 1.25, y: y + 0.8, w: 4.4, h: 0.5, isTextBox: true, fontFace: BODY, fontSize: 14, color: C.muted, margin: 0 });
  });
  s.addText("Future work: CI/CD pipeline  ·  NetBox source of truth  ·  site-to-site VPN to AWS  ·  remote Terraform state", {
    x: 0.6, y: 5.8, w: 12.1, h: 0.5, isTextBox: true, fontFace: BODY, fontSize: 15, italic: true, color: C.teal, margin: 0 });
  s.addNotes("Any member: explain the challenges briefly and what we would do next.");

  // ---------------------------------------------------------------- 17 conclusion
  s = pres.addSlide(); s.background = { color: C.navy };
  presenter(s, 0, true);
  s.addText("Conclusion", { x: 0.8, y: 0.9, w: 8, h: 0.8, isTextBox: true, fontFace: H, fontSize: 40, bold: true, color: C.white, margin: 0 });
  const concl = [[I.net, "Secure hierarchical network built and verified"], [I.robot, "Managed as code: idempotent, audited, version-controlled"],
    [I.cloud, "AWS deployed, tested and cleanly removed with Terraform"]];
  concl.forEach(([ic, t], i) => {
    const y = 2.15 + i * 1.1;
    iconCircle(s, ic, 0.8, y, 0.72, [C.teal, C.navy2, C.amber][i]);
    s.addText(t, { x: 1.8, y, w: 10, h: 0.72, isTextBox: true, fontFace: BODY, fontSize: 20, color: C.white, margin: 0, valign: "middle" });
  });
  s.addText("Thank you  -  Questions?", { x: 0.8, y: 5.75, w: 11.5, h: 0.8, isTextBox: true, fontFace: H, fontSize: 32, bold: true, color: C.amber, margin: 0 });
  s.addNotes("Member 3 closes, then the whole team takes questions.");

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();
