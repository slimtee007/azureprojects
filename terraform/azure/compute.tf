# Linux application host (Docker + the AzureDrop stack runs here).
# The VM uses a system-assigned managed identity - see identity.tf.

# Cloud-init: install Docker Engine + Compose plugin + helper tools.
locals {
  custom_data = <<-CLOUD_INIT
    #cloud-config
    package_update: true
    packages:
      - ca-certificates
      - curl
      - git
      - jq
    runcmd:
      - install -m 0755 -d /etc/apt/keyrings
      - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
      - chmod a+r /etc/apt/keyrings/docker.asc
      - echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
      - apt-get update
      - apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      - usermod -aG docker ${var.vm_admin_username}
  CLOUD_INIT
}

resource "azurerm_linux_virtual_machine" "app" {
  name                = "${var.prefix}-vm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = var.vm_size
  admin_username      = var.vm_admin_username
  network_interface_ids = [
    azurerm_network_interface.app.id,
  ]
  custom_data = base64encode(local.custom_data)
  tags        = var.tags

  # System-assigned managed identity: no storage access keys on the VM.
  identity {
    type = "SystemAssigned"
  }

  admin_ssh_key {
    username   = var.vm_admin_username
    public_key = var.vm_admin_ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }
}
