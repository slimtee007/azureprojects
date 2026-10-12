variable "prefix" {
  description = "Short name prefix for all AzureDrop resources."
  type        = string
  default     = "azuredrop"

  validation {
    condition     = can(regex("^[a-z0-9-]{2,16}$", var.prefix))
    error_message = "prefix must be 2-16 characters of lowercase letters, digits or hyphens."
  }
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "westeurope"
}

variable "admin_cidr" {
  description = "CIDR allowed to SSH to the VM (your admin IP, e.g. 203.0.113.4/32)."
  type        = string
  default     = "203.0.113.4/32"
}

variable "vm_size" {
  description = "Azure VM size for the application host."
  type        = string
  default     = "Standard_B2s"
}

variable "vm_admin_username" {
  description = "Admin user for the Linux VM."
  type        = string
  default     = "azureuser"
}

variable "vm_admin_ssh_public_key" {
  description = "SSH public key (contents of your .pub file) for the VM admin user."
  type        = string
  # Example (do not use literally): "ssh-rsa AAAAB3... user@host"
}

variable "postgres_admin_login" {
  description = "Administrator login for PostgreSQL Flexible Server."
  type        = string
  default     = "azuredropadmin"
}

variable "postgres_admin_password" {
  description = "Administrator password for PostgreSQL Flexible Server (sensitive)."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.postgres_admin_password) >= 16
    error_message = "postgres_admin_password must be at least 16 characters."
  }
}

variable "postgres_sku" {
  description = "SKU for PostgreSQL Flexible Server (burstable tier keeps costs down)."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_version" {
  description = "PostgreSQL server version."
  type        = string
  default     = "16"
}

variable "blob_container_name" {
  description = "Private blob container that stores file objects."
  type        = string
  default     = "azuredrop"
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default = {
    project = "azuredrop"
    purpose = "team-capstone"
  }
}
