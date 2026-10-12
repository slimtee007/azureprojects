# AzureDrop - AWS demo infrastructure.
# AzureDrop remains Azure-oriented; this configuration only provisions the
# public demo host (EC2) used because Azure credits were unavailable.
#
#   terraform init
#   terraform fmt -recursive
#   terraform validate
#   terraform plan
#   terraform apply

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
