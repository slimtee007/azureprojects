# Identity and RBAC: the VM's system-assigned identity gets data-plane
# access to Blob storage - no access keys are stored on the host.

resource "azurerm_role_assignment" "vm_blob_contributor" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_virtual_machine.app.identity[0].principal_id
  description          = "Allow the AzureDrop VM to manage blobs via its managed identity"
}
