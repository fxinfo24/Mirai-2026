#!/usr/bin/env python3
"""
Kubernetes Integration for Distributor

Integrates with Kubernetes for:
- Automatic loader node discovery (Service Discovery)
- Horizontal Pod Autoscaling (HPA) based on metrics
- ConfigMap/Secret management
- Prometheus metrics export

@author Mirai 2026 Research Team
@date 2026-02-25
"""

import asyncio
import os
import logging
from typing import List, Optional
from kubernetes import client, config, watch
from kubernetes.client.rest import ApiException

from distributor import Distributor, LoaderNode, LoaderStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class KubernetesDistributor(Distributor):
    """
    Distributor with Kubernetes integration
    """
    
    def __init__(self, namespace: str = "mirai-2026", 
                 service_name: str = "loader-service",
                 health_check_interval: int = 10):
        super().__init__(health_check_interval)
        
        self.namespace = namespace
        self.service_name = service_name
        self.k8s_api: Optional[client.CoreV1Api] = None
        self.k8s_apps_api: Optional[client.AppsV1Api] = None
        self.k8s_metrics_api: Optional[client.CustomObjectsApi] = None
        
        # Initialize Kubernetes client
        try:
            # Try in-cluster config first
            config.load_incluster_config()
            logger.info("Loaded in-cluster Kubernetes config")
        except Exception:
            try:
                # Fall back to kubeconfig
                config.load_kube_config()
                logger.info("Loaded kubeconfig")
            except Exception as e:
                logger.warning(f"Could not load Kubernetes config: {e}")
                logger.warning("Running in standalone mode")
                return
        
        self.k8s_api = client.CoreV1Api()
        self.k8s_apps_api = client.AppsV1Api()
        self.k8s_metrics_api = client.CustomObjectsApi()
        
        logger.info(f"Kubernetes distributor initialized for namespace={namespace}")
    
    async def discover_loader_pods(self):
        """
        Discover loader pods via Kubernetes Service Discovery
        """
        if not self.k8s_api:
            logger.warning("Kubernetes API not available, skipping discovery")
            return
        
        try:
            # Get pods with loader label
            pods = self.k8s_api.list_namespaced_pod(
                namespace=self.namespace,
                label_selector="app=loader"
            )
            
            discovered_nodes = []
            
            for pod in pods.items:
                # Only consider running pods
                if pod.status.phase != "Running":
                    continue
                
                pod_name = pod.metadata.name
                pod_ip = pod.status.pod_ip
                
                if not pod_ip:
                    continue
                
                # Get port from container spec
                port = 8000  # Default
                if pod.spec.containers:
                    for container in pod.spec.containers:
                        if container.ports:
                            port = container.ports[0].container_port
                            break
                
                # Get source IPs from annotations
                source_ips = []
                if pod.metadata.annotations:
                    source_ips_str = pod.metadata.annotations.get("loader.mirai/source-ips", "")
                    if source_ips_str:
                        source_ips = source_ips_str.split(",")
                
                # Get max connections from annotations
                max_connections = int(
                    pod.metadata.annotations.get("loader.mirai/max-connections", "60000")
                ) if pod.metadata.annotations else 60000
                
                discovered_nodes.append({
                    'name': pod_name,
                    'host': pod_ip,
                    'port': port,
                    'source_ips': source_ips,
                    'max_connections': max_connections,
                })
            
            # Update node list
            self._update_nodes(discovered_nodes)
            
            logger.info(f"Discovered {len(discovered_nodes)} loader pods")
        
        except ApiException as e:
            logger.error(f"Kubernetes API error during discovery: {e}")
    
    def _update_nodes(self, discovered_nodes: List[dict]):
        """Update internal node list based on discovery"""
        # Build map of existing nodes
        existing = {n.name: n for n in self.nodes}
        discovered_names = {n['name'] for n in discovered_nodes}
        
        # Remove nodes that no longer exist
        self.nodes = [n for n in self.nodes if n.name in discovered_names]
        
        # Add/update nodes
        for node_info in discovered_nodes:
            if node_info['name'] in existing:
                # Update existing node
                node = existing[node_info['name']]
                node.host = node_info['host']
                node.port = node_info['port']
                node.source_ips = node_info['source_ips']
                node.max_connections = node_info['max_connections']
            else:
                # Add new node
                self.add_node(
                    host=node_info['host'],
                    port=node_info['port'],
                    name=node_info['name'],
                    source_ips=node_info['source_ips'],
                    max_connections=node_info['max_connections']
                )
    
    async def watch_loader_pods(self):
        """Watch for changes in loader pods"""
        if not self.k8s_api:
            return
        
        w = watch.Watch()
        
        try:
            for event in w.stream(
                self.k8s_api.list_namespaced_pod,
                namespace=self.namespace,
                label_selector="app=loader",
                timeout_seconds=0  # Watch indefinitely
            ):
                event_type = event['type']
                pod = event['object']
                pod_name = pod.metadata.name
                
                logger.info(f"Pod event: {event_type} - {pod_name}")
                
                # Re-discover on any change
                await self.discover_loader_pods()
        
        except Exception as e:
            logger.error(f"Watch error: {e}")
    
    async def get_hpa_metrics(self) -> dict:
        """
        Get metrics for Horizontal Pod Autoscaling
        
        Returns metrics that can be used by HPA to scale loader pods
        """
        stats = self.get_stats()
        
        # Calculate metrics
        metrics = {
            # Average utilization across all nodes
            'avg_utilization_pct': stats['capacity']['utilization_pct'],
            
            # Average queue length per node
            'avg_queue_per_node': (
                stats['tasks']['queue_length'] / len(self.nodes)
                if len(self.nodes) > 0 else 0
            ),
            
            # Number of unhealthy nodes
            'unhealthy_nodes': stats['nodes']['unhealthy'],
            
            # Total available capacity
            'available_capacity': stats['capacity']['available'],
        }
        
        return metrics
    
    async def export_metrics_to_prometheus(self):
        """
        Export metrics in Prometheus format
        
        Creates a ConfigMap with metrics that Prometheus can scrape
        """
        if not self.k8s_api:
            return
        
        metrics = await self.get_hpa_metrics()
        stats = self.get_stats()
        
        # Prometheus metric format
        prometheus_metrics = []
        
        # Capacity metrics
        prometheus_metrics.append(
            f'distributor_capacity_total{{namespace="{self.namespace}"}} {stats["capacity"]["total"]}'
        )
        prometheus_metrics.append(
            f'distributor_capacity_used{{namespace="{self.namespace}"}} {stats["capacity"]["used"]}'
        )
        prometheus_metrics.append(
            f'distributor_capacity_utilization_pct{{namespace="{self.namespace}"}} {metrics["avg_utilization_pct"]:.2f}'
        )
        
        # Node metrics
        prometheus_metrics.append(
            f'distributor_nodes_total{{namespace="{self.namespace}"}} {stats["nodes"]["total"]}'
        )
        prometheus_metrics.append(
            f'distributor_nodes_healthy{{namespace="{self.namespace}"}} {stats["nodes"]["healthy"]}'
        )
        prometheus_metrics.append(
            f'distributor_nodes_unhealthy{{namespace="{self.namespace}"}} {stats["nodes"]["unhealthy"]}'
        )
        
        # Task metrics
        prometheus_metrics.append(
            f'distributor_tasks_total{{namespace="{self.namespace}"}} {stats["tasks"]["total_tasks"]}'
        )
        prometheus_metrics.append(
            f'distributor_tasks_distributed{{namespace="{self.namespace}"}} {stats["tasks"]["distributed_tasks"]}'
        )
        prometheus_metrics.append(
            f'distributor_tasks_failed{{namespace="{self.namespace}"}} {stats["tasks"]["failed_distributions"]}'
        )
        prometheus_metrics.append(
            f'distributor_tasks_queued{{namespace="{self.namespace}"}} {stats["tasks"]["queue_length"]}'
        )
        
        # Per-node metrics
        for node_detail in stats['node_details']:
            labels = f'namespace="{self.namespace}",node="{node_detail["name"]}"'
            prometheus_metrics.append(
                f'distributor_node_load_pct{{{labels}}} {node_detail["load_pct"]:.2f}'
            )
            prometheus_metrics.append(
                f'distributor_node_success_rate{{{labels}}} {node_detail["success_rate"]:.2f}'
            )
            prometheus_metrics.append(
                f'distributor_node_response_time_ms{{{labels}}} {node_detail["response_time_ms"]:.2f}'
            )
        
        metrics_text = "\n".join(prometheus_metrics)
        
        # Create/update ConfigMap with metrics
        try:
            configmap = client.V1ConfigMap(
                metadata=client.V1ObjectMeta(
                    name="distributor-metrics",
                    namespace=self.namespace
                ),
                data={'metrics': metrics_text}
            )
            
            try:
                self.k8s_api.create_namespaced_config_map(
                    namespace=self.namespace,
                    body=configmap
                )
                logger.debug("Created metrics ConfigMap")
            except ApiException as e:
                if e.status == 409:  # Already exists
                    self.k8s_api.patch_namespaced_config_map(
                        name="distributor-metrics",
                        namespace=self.namespace,
                        body=configmap
                    )
                    logger.debug("Updated metrics ConfigMap")
                else:
                    raise
        
        except ApiException as e:
            logger.error(f"Failed to export metrics: {e}")
    
    async def scale_loader_deployment(self, target_replicas: int):
        """
        Scale the loader deployment
        
        Used for manual scaling or by autoscaling logic
        """
        if not self.k8s_apps_api:
            logger.warning("Kubernetes Apps API not available")
            return False
        
        try:
            # Get current deployment
            deployment = self.k8s_apps_api.read_namespaced_deployment(
                name="loader",
                namespace=self.namespace
            )
            
            current_replicas = deployment.spec.replicas
            
            if current_replicas == target_replicas:
                logger.info(f"Already at target replicas: {target_replicas}")
                return True
            
            # Update replicas
            deployment.spec.replicas = target_replicas
            
            self.k8s_apps_api.patch_namespaced_deployment(
                name="loader",
                namespace=self.namespace,
                body=deployment
            )
            
            logger.info(f"Scaled loader deployment: {current_replicas} → {target_replicas}")
            return True
        
        except ApiException as e:
            logger.error(f"Failed to scale deployment: {e}")
            return False
    
    async def auto_scale_logic(self):
        """
        Simple autoscaling logic based on metrics
        
        Scale up if:
        - Utilization > 70%
        - Queue length > 100
        
        Scale down if:
        - Utilization < 30%
        - Queue length == 0
        """
        if not self.k8s_apps_api:
            return
        
        metrics = await self.get_hpa_metrics()
        stats = self.get_stats()
        
        current_nodes = stats['nodes']['total']
        
        # Determine if scaling is needed
        should_scale_up = (
            metrics['avg_utilization_pct'] > 70 or
            stats['tasks']['queue_length'] > 100
        )
        
        should_scale_down = (
            metrics['avg_utilization_pct'] < 30 and
            stats['tasks']['queue_length'] == 0 and
            current_nodes > 1  # Keep at least 1
        )
        
        if should_scale_up:
            target_replicas = min(current_nodes + 1, 10)  # Max 10 nodes
            logger.info(f"Scaling up: utilization={metrics['avg_utilization_pct']:.1f}%, "
                       f"queue={stats['tasks']['queue_length']}")
            await self.scale_loader_deployment(target_replicas)
        
        elif should_scale_down:
            target_replicas = max(current_nodes - 1, 1)  # Min 1 node
            logger.info(f"Scaling down: utilization={metrics['avg_utilization_pct']:.1f}%")
            await self.scale_loader_deployment(target_replicas)
    
    async def start(self):
        """Start the Kubernetes distributor"""
        await super().start()
        
        if self.k8s_api:
            # Initial discovery
            await self.discover_loader_pods()
            
            # Start watching for pod changes
            asyncio.create_task(self.watch_loader_pods())
            
            # Start metrics export (every 30 seconds)
            async def metrics_loop():
                while True:
                    await asyncio.sleep(30)
                    await self.export_metrics_to_prometheus()
            
            asyncio.create_task(metrics_loop())
            
            # Start autoscaling loop (every 60 seconds)
            async def autoscale_loop():
                while True:
                    await asyncio.sleep(60)
                    await self.auto_scale_logic()
            
            asyncio.create_task(autoscale_loop())
        
        logger.info("Kubernetes distributor started with all integrations")


# Example usage
async def main():
    """Example usage"""
    
    # Create Kubernetes distributor
    distributor = KubernetesDistributor(
        namespace="mirai-2026",
        service_name="loader-service",
        health_check_interval=10
    )
    
    # Start (includes discovery and autoscaling)
    await distributor.start()
    
    # Let it run for a while
    await asyncio.sleep(60)
    
    # Print stats
    import json
    stats = distributor.get_stats()
    print(json.dumps(stats, indent=2))
    
    # Stop
    await distributor.stop()


if __name__ == "__main__":
    asyncio.run(main())
