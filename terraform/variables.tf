variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-2"
}

variable "aws_profile" {
  description = "Named AWS CLI profile holding the IAM credentials"
  type        = string
  default     = "terraform-user"
}

variable "project" {
  description = "Project name used for naming and tagging"
  type        = string
  default     = "ent-hybrid-net"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "lab"
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC (kept separate from on-prem 10.0.0.0/8 ranges used in GNS3)"
  type        = string
  default     = "172.20.0.0/16"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_cidrs" {
  description = "Two public subnets (one per AZ)"
  type        = list(string)
  default     = ["172.20.1.0/24", "172.20.2.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "Exactly two public subnets are required."
  }
}

variable "private_subnet_cidrs" {
  description = "Two private subnets (one per AZ)"
  type        = list(string)
  default     = ["172.20.11.0/24", "172.20.12.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == 2
    error_message = "Exactly two private subnets are required."
  }
}

variable "admin_cidr" {
  description = "Public IP range allowed to SSH to the bastion host (e.g. your IP /32)"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.admin_cidr)) && var.admin_cidr != "0.0.0.0/0"
    error_message = "admin_cidr must be a valid CIDR and must not be 0.0.0.0/0."
  }
}

variable "instance_type" {
  description = "EC2 instance type (free-tier eligible)"
  type        = string
  default     = "t3.micro"
}

variable "enable_nat_gateway" {
  description = "Create a NAT gateway for private-subnet egress (NOT free tier - off by default)"
  type        = bool
  default     = false
}
