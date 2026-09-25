terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }

  # Local state for the lab. For a team, switch to the S3 backend with state locking:
  # backend "s3" {
  #   bucket       = "ent-hybrid-net-tfstate"
  #   key          = "aws/terraform.tfstate"
  #   region       = "ap-southeast-2"
  #   use_lockfile = true
  #   encrypt      = true
  # }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
      Repository  = "Enterprise-Network-Automation"
    }
  }
}
