variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

# Bot worker nodes
variable "bot_node_desired_count" {
  description = "Desired number of bot worker nodes"
  type        = number
  default     = 3
}

variable "bot_node_min_count" {
  description = "Minimum number of bot worker nodes"
  type        = number
  default     = 1
}

variable "bot_node_max_count" {
  description = "Maximum number of bot worker nodes"
  type        = number
  default     = 10
}

# AI worker nodes
variable "ai_node_desired_count" {
  description = "Desired number of AI worker nodes"
  type        = number
  default     = 2
}

variable "ai_node_min_count" {
  description = "Minimum number of AI worker nodes"
  type        = number
  default     = 1
}

variable "ai_node_max_count" {
  description = "Maximum number of AI worker nodes"
  type        = number
  default     = 5
}

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_master_username" {
  description = "RDS master username"
  type        = string
  default     = "mirai_admin"
  sensitive   = true
}

variable "db_backup_retention" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

# Monitoring
variable "alarm_email" {
  description = "Email for CloudWatch alarms"
  type        = string
  default     = "alerts@example.com"
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project    = "mirai-2026"
    ManagedBy  = "terraform"
  }
}
