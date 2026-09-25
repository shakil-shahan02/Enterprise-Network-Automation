# ENT-HYBRID-NET – Enterprise Network Automation & Hybrid Cloud IaC

Consulting-team project: design, automate, secure and deploy a multinational enterprise network
(Headquarters, Branch Office, Data Centre) with **GNS3**, **Ansible**, **Git** and **Terraform on AWS**.

| Part | Folder | What it contains |
|---|---|---|
| A – Enterprise network design | `gns3/`, `configs/`, `scripts/`, `docs/` | GNS3 topology builder (REST API), hierarchical design, IP plan, Day-0 IOS configs |
| B – Network automation | `ansible/` | Inventory, group/host vars (source of truth), 8 roles, playbooks, backups, reports |
| C – Cloud IaC | `terraform/` | AWS VPC, 2 public + 2 private subnets, IGW, route tables, SGs, bastion, EC2, key pair |
| Evidence | `evidence/`, `screenshots/` | Command outputs, Ansible runs, Terraform plan, screenshots |
| Report | `report/` | Technical report (Word) |

## Topology (hierarchical: Core / Distribution / Access)

```
                              INTERNET (GNS3 NAT)
                                     |
                            R4-CORE  (Area 0, PAT, NTP master)
                 10.255.0.0/30 /     | 10.255.0.8/30  \ 10.255.0.4/30
          R1-HQ (ABR A10) ---- R3-DC (ABR A30)          R2-BR (ABR A20)      <- distribution / WAN edge
               |    10.255.0.12/30   |  (DNS server)        |
          SW1-HQ-DIST           SW5-DC-DIST             SW3-BR-DIST          <- distribution switches
            ||  (2x trunk, STP)     ||                      ||
          SW2-HQ-ACC            SW6-DC-ACC              SW4-BR-ACC           <- access switches
       IT  FIN  GUEST        WEB1   ANSIBLE-SRV        SALES   OPS
      V10  V20  V30          V60    V100               V40     V50
```

## Quick start

```bash
# Part A – build the lab and push Day-0 configs (Windows host, GNS3 running)
python gns3/build_topology.py
python scripts/gen_configs.py
python scripts/bootstrap.py

# Part B – on ANSIBLE-SRV (10.30.100.10)
cd /root/ansible && source venv/bin/activate
ansible-playbook playbooks/site.yml            # full pipeline
ansible-playbook playbooks/site.yml --check --diff   # dry run

# Part C – Terraform
cd terraform && terraform init && terraform plan -out tfplan
```

Secrets are never committed: `scripts/secrets.local.json`, `ansible/.vault_pass`, `terraform/keys/`
and Terraform state are git-ignored; Ansible credentials live in an **Ansible Vault** file.
