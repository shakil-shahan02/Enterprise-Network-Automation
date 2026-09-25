output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  description = "Internet gateway ID"
  value       = aws_internet_gateway.igw.id
}

output "bastion_public_ip" {
  description = "Public IP of the bastion host"
  value       = aws_instance.bastion.public_ip
}

output "app_private_ip" {
  description = "Private IP of the application server"
  value       = aws_instance.app.private_ip
}

output "ssh_to_bastion" {
  description = "SSH command for the bastion"
  value       = "ssh -i keys/${local.name}-key.pem ec2-user@${aws_instance.bastion.public_ip}"
}

output "ssh_to_app_via_bastion" {
  description = "SSH to the private server using the bastion as a jump host"
  value       = "ssh -i keys/${local.name}-key.pem -J ec2-user@${aws_instance.bastion.public_ip} ec2-user@${aws_instance.app.private_ip}"
}
