# ---------------- Bastion security group: SSH only from the admin's public IP ----------------
resource "aws_security_group" "bastion" {
  name        = "${local.name}-bastion-sg"
  description = "SSH to bastion from admin CIDR only"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-bastion-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "bastion_ssh" {
  security_group_id = aws_security_group.bastion.id
  description       = "SSH from admin"
  cidr_ipv4         = var.admin_cidr
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

resource "aws_vpc_security_group_egress_rule" "bastion_all" {
  security_group_id = aws_security_group.bastion.id
  description       = "Allow all outbound"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# ---------------- App (private) security group: SSH only via bastion, HTTP inside VPC ----------------
resource "aws_security_group" "app" {
  name        = "${local.name}-app-sg"
  description = "Private app server - SSH from bastion SG, HTTP from VPC"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-app-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "app_ssh_from_bastion" {
  security_group_id            = aws_security_group.app.id
  description                  = "SSH from bastion only"
  referenced_security_group_id = aws_security_group.bastion.id
  ip_protocol                  = "tcp"
  from_port                    = 22
  to_port                      = 22
}

resource "aws_vpc_security_group_ingress_rule" "app_http_from_vpc" {
  security_group_id = aws_security_group.app.id
  description       = "HTTP from inside the VPC"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "app_icmp_from_vpc" {
  security_group_id = aws_security_group.app.id
  description       = "ICMP from inside the VPC"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "icmp"
  from_port         = -1
  to_port           = -1
}

resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  description       = "Allow all outbound"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
