variable "aws_region" {
  description = "AWS region for the demo host."
  type        = string
  default     = "eu-west-1"
}

variable "name_prefix" {
  description = "Name prefix for demo resources."
  type        = string
  default     = "azuredrop-demo"
}

variable "instance_type" {
  description = "EC2 instance type (small is enough for a single-host demo)."
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair for SSH access."
  type        = string
}

variable "admin_cidr" {
  description = "CIDR allowed to SSH (your admin IP, e.g. 203.0.113.4/32)."
  type        = string
  default     = "203.0.113.4/32"
}

variable "ssh_public_key" {
  description = "Optional: public key material if the module should create the key pair (leave empty to use an existing one)."
  type        = string
  default     = ""
}

variable "root_volume_gb" {
  description = "Root EBS volume size in GB (holds PostgreSQL + Azurite data)."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default = {
    project = "azuredrop"
    role    = "live-demo-host"
  }
}
