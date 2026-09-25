# Independent post-destroy audit: anything billable left in the AWS account?
$P = @('--profile','terraform-user')
Write-Host '>>> Part C | Post-destroy billing audit of AWS account (all regions) - independent of Terraform state' -ForegroundColor Cyan
$regions = aws ec2 describe-regions @P --region ap-southeast-2 --query 'Regions[].RegionName' --output text
$issues = 0
$rows = foreach ($r in ($regions -split '\s+' | Where-Object { $_ })) {
  $A = $P + @('--region', $r)
  $inst = [int](aws ec2 describe-instances @A --filters Name=instance-state-name,Values=pending,running,stopping,stopped --query 'length(Reservations[].Instances[])' --output text)
  $vol  = [int](aws ec2 describe-volumes @A --query 'length(Volumes)' --output text)
  $eip  = [int](aws ec2 describe-addresses @A --query 'length(Addresses)' --output text)
  $nat  = [int](aws ec2 describe-nat-gateways @A --filter Name=state,Values=pending,available --query 'length(NatGateways)' --output text)
  $vpc  = [int](aws ec2 describe-vpcs @A --filters Name=is-default,Values=false --query 'length(Vpcs)' --output text)
  $key  = [int](aws ec2 describe-key-pairs @A --query 'length(KeyPairs)' --output text)
  $snap = [int](aws ec2 describe-snapshots @A --owner-ids self --query 'length(Snapshots)' --output text)
  $sum = $inst + $vol + $eip + $nat + $vpc + $key + $snap; $issues += $sum
  [pscustomobject]@{Region=$r; Instances=$inst; EBSVolumes=$vol; ElasticIPs=$eip; NATGateways=$nat; CustomVPCs=$vpc; KeyPairs=$key; Snapshots=$snap; Status=$(if ($sum) {'CHECK'} else {'clean'})}
}
$rows | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
Write-Host '# ap-southeast-2 detail: terminated instances (not billed) and remaining VPCs' -ForegroundColor Yellow
aws ec2 describe-instances @P --region ap-southeast-2 --query 'Reservations[].Instances[].[InstanceId, State.Name, Tags[?Key==`Name`]|[0].Value]' --output table
aws ec2 describe-vpcs @P --region ap-southeast-2 --query 'Vpcs[].[VpcId, CidrBlock, IsDefault]' --output table
if ($issues -eq 0) { Write-Host 'RESULT: 0 billable resources in any region - account is clean.' -ForegroundColor Green } else { Write-Host "RESULT: $issues item(s) need review" -ForegroundColor Red }
