output "resource_group_name" {
  description = "Resource group containing all AzureDrop resources."
  value       = azurerm_resource_group.main.name
}

output "vm_public_ip" {
  description = "Public IP of the application VM."
  value       = azurerm_public_ip.app.ip_address
}

output "vm_name" {
  description = "Application VM name."
  value       = azurerm_linux_virtual_machine.app.name
}

output "vm_managed_identity_principal_id" {
  description = "Principal ID of the VM's system-assigned managed identity."
  value       = azurerm_linux_virtual_machine.app.identity[0].principal_id
}

output "storage_account_name" {
  description = "Storage account that holds the private blob container."
  value       = azurerm_storage_account.main.name
}

output "blob_container_name" {
  description = "Private blob container for file objects."
  value       = azurerm_storage_container.files.name
}

output "postgres_fqdn" {
  description = "PostgreSQL Flexible Server FQDN (private DNS zone)."
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_database" {
  description = "Application database name."
  value       = azurerm_postgresql_flexible_server_database.azuredrop.name
}

output "postgres_admin_login" {
  description = "PostgreSQL administrator login."
  value       = azurerm_postgresql_flexible_server.main.administrator_login
}
