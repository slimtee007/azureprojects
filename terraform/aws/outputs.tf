output "ec2_public_ip" {
  description = "Public IP of the AWS demo host."
  value       = aws_instance.demo.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS name of the AWS demo host."
  value       = aws_instance.demo.public_dns
}

output "ssh_command" {
  description = "SSH into the demo host."
  value       = "ssh -i <key.pem> ubuntu@${aws_instance.demo.public_ip}"
}

output "security_group_id" {
  description = "Security group of the demo host."
  value       = aws_security_group.demo.id
}
