# Identity and RBAC: the VM's system-assigned identity gets data-plane
# access to Blob storage - no access keys are stored on the host.

data "azurerm_role_definition" "blob_data_contributor" {
  name = "Storage Blob Data Contributor"
}

resource "azurerm_role_assignment" "vm_blob_contributor" {
  scope              = azurerm_storage_account.main.id
  role_definition_id = data.azurerm_role_definition.blob_data_contributor.role_definition_resource_id
  principal_id       = azurerm_linux_virtual_machine.app.identity[0].principal_id
  description        = "Allow the AzureDrop VM to manage blobs via its managed identity"
}
