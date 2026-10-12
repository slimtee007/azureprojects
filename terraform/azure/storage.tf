# Storage account + private blob container (real file object storage).

# Storage account names: 3-24 lowercase letters and digits only.
locals {
  storage_account_name = substr(replace("${var.prefix}store", "-", ""), 0, 24)
}

resource "azurerm_storage_account" "main" {
  name                            = local.storage_account_name
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  enable_https_traffic_only       = true
  tags                            = var.tags
}

# Files are private; access is via short-lived signed URLs or RBAC identity.
resource "azurerm_storage_container" "files" {
  name                  = var.blob_container_name
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}
