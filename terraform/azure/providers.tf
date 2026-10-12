# AzureDrop - Azure target infrastructure.
# This configuration describes the intended Azure deployment. It can be
# initialized and validated without an Azure subscription:
#
#   terraform init
#   terraform fmt -recursive
#   terraform validate
#
# plan/apply require real Azure credentials. We only claim "deployed to
# Azure" if a real subscription is used.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.116"
    }
  }

  # Optional remote state (uncomment and configure for team use):
  # backend "azurerm" {
  #   resource_group_name  = "tfstate-rg"
  #   storage_account_name = "tfstateXXXXXX"
  #   container_name       = "tfstate"
  #   key                  = "azuredrop.tfstate"
  # }
}

provider "azurerm" {
  features {}
}
