$A = @('--profile','terraform-user','--region','ap-southeast-2')
$F = @('--filters','Name=tag:Project,Values=ent-hybrid-net')
Write-Host '>>> Part C | AWS CLI - route tables, internet gateway, security groups, key pair' -ForegroundColor Cyan
Write-Host "`n# Route tables" -ForegroundColor Yellow
aws ec2 describe-route-tables @A @F --query 'RouteTables[].[Tags[?Key==`Name`]|[0].Value, RouteTableId, length(Associations)]' --output table
aws ec2 describe-route-tables @A @F --query 'RouteTables[].Routes[].[DestinationCidrBlock, GatewayId, State]' --output table
Write-Host "# Internet gateway" -ForegroundColor Yellow
aws ec2 describe-internet-gateways @A @F --query 'InternetGateways[].[InternetGatewayId, Attachments[0].VpcId, Attachments[0].State]' --output table
Write-Host "# Security group ingress rules" -ForegroundColor Yellow
aws ec2 describe-security-group-rules @A --filters Name=group-id,Values=$(aws ec2 describe-security-groups @A @F --query 'join(`,`, SecurityGroups[].GroupId)' --output text) --query 'SecurityGroupRules[?IsEgress==`false`].[GroupId, IpProtocol, FromPort, ToPort, CidrIpv4, ReferencedGroupInfo.GroupId, Description]' --output table
Write-Host "# Key pair" -ForegroundColor Yellow
aws ec2 describe-key-pairs @A --key-names ent-hybrid-net-lab-key --query 'KeyPairs[].[KeyName, KeyType, KeyPairId]' --output table
