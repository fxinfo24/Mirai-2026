/**
 * Mirai 2026 - Cloud Infrastructure
 * 
 * This Terraform configuration provisions the complete infrastructure for
 * the Mirai 2026 research platform.
 */

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "s3" {
    bucket         = "mirai-2026-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "mirai-2026-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "mirai-2026"
      Environment = var.environment
      ManagedBy   = "terraform"
      Purpose     = "security-research"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  
  tags = var.common_tags
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"
  
  environment        = var.environment
  cluster_name       = "mirai-2026-${var.environment}"
  cluster_version    = var.kubernetes_version
  
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  
  node_groups = {
    bot_workers = {
      desired_size = var.bot_node_desired_count
      min_size     = var.bot_node_min_count
      max_size     = var.bot_node_max_count
      
      instance_types = ["t3.medium"]
      capacity_type  = "SPOT"
      
      labels = {
        role = "bot"
      }
      
      taints = []
    }
    
    ai_workers = {
      desired_size = var.ai_node_desired_count
      min_size     = var.ai_node_min_count
      max_size     = var.ai_node_max_count
      
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
      
      labels = {
        role = "ai"
      }
      
      taints = []
    }
  }
  
  tags = var.common_tags
}

# RDS Database Module
module "rds" {
  source = "./modules/rds"
  
  environment            = var.environment
  identifier             = "mirai-2026-${var.environment}"
  
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  
  database_name         = "mirai"
  master_username       = var.db_master_username
  
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  
  backup_retention_period = var.db_backup_retention
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  multi_az              = var.environment == "prod" ? true : false
  
  tags = var.common_tags
}

# S3 Buckets for data storage
module "s3" {
  source = "./modules/s3"
  
  environment = var.environment
  
  buckets = {
    scan_results = {
      bucket_name = "mirai-2026-scan-results-${var.environment}"
      versioning  = true
      encryption  = true
      lifecycle_rules = [
        {
          id      = "expire-old-scans"
          enabled = true
          expiration = {
            days = 90
          }
        }
      ]
    }
    
    attack_logs = {
      bucket_name = "mirai-2026-attack-logs-${var.environment}"
      versioning  = true
      encryption  = true
      lifecycle_rules = [
        {
          id      = "expire-old-logs"
          enabled = true
          expiration = {
            days = 30
          }
        }
      ]
    }
    
    ai_models = {
      bucket_name = "mirai-2026-ai-models-${var.environment}"
      versioning  = true
      encryption  = true
    }
  }
  
  tags = var.common_tags
}

# CloudWatch Monitoring
module "monitoring" {
  source = "./modules/monitoring"
  
  environment  = var.environment
  cluster_name = module.eks.cluster_name
  
  enable_container_insights = true
  enable_prometheus         = true
  enable_grafana           = true
  
  alarm_email = var.alarm_email
  
  tags = var.common_tags
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "s3_bucket_scan_results" {
  description = "S3 bucket for scan results"
  value       = module.s3.bucket_ids["scan_results"]
}
