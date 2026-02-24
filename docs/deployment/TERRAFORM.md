# Terraform Infrastructure Guide

Deploy Mirai 2026 infrastructure with Terraform.

## Quick Start

```bash
cd terraform/

# Initialize
terraform init

# Plan deployment
terraform plan -var="environment=dev"

# Deploy
terraform apply -var="environment=dev"
```

## What Gets Created

- **VPC**: Isolated network (10.0.0.0/16)
- **EKS Cluster**: Kubernetes (3 nodes)
- **RDS PostgreSQL**: Database (Multi-AZ)
- **S3 Buckets**: Logs, backups
- **CloudWatch**: Monitoring

## Modules

Located in `terraform/modules/`:

- `vpc/` - Network infrastructure
- `eks/` - Kubernetes cluster
- `rds/` - Database
- `s3/` - Storage
- `monitoring/` - CloudWatch, alarms

## Variables

Key variables in `terraform/variables.tf`:

```hcl
environment    = "dev"           # dev, staging, prod
vpc_cidr       = "10.0.0.0/16"
eks_node_count = 3
db_instance    = "db.t3.medium"
```

## Outputs

After apply:
```bash
terraform output eks_cluster_endpoint
terraform output rds_endpoint
terraform output kubeconfig
```

## Cost Estimate

**Development:**
- EKS: ~$70/month
- RDS (t3.medium): ~$60/month
- Bandwidth: Variable
- **Total: ~$150/month**

**Production:**
- EKS (larger nodes): ~$300/month
- RDS (Multi-AZ): ~$200/month
- **Total: ~$600/month**

## State Management

State stored in S3 (configured in `backend.tf`):
```hcl
terraform {
  backend "s3" {
    bucket = "mirai-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Destroy Infrastructure

```bash
terraform destroy -var="environment=dev"
```

**Warning**: This deletes everything!

## Related Documentation

- [Kubernetes Deployment](KUBERNETES.md) - Deploy to cluster
- [Architecture](../ARCHITECTURE.md) - System design
- [Security](../guides/SECURITY.md) - Hardening

## Troubleshooting

**EKS creation fails:**
```bash
# Check IAM permissions
aws sts get-caller-identity
```

**RDS connection issues:**
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx
```

See [terraform/README.md](../../terraform/README.md) for more details.
