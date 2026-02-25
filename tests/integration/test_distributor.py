#!/usr/bin/env python3
"""
Test suite for load distributor

Tests:
- Node management
- Health checking
- Load balancing strategies
- Task distribution
- Failover
"""

import asyncio
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..', 'ai'))

from distributor import Distributor, LoaderNode, LoadTask, LoaderStatus


@pytest.mark.asyncio
async def test_node_management():
    """Test adding and managing nodes"""
    distributor = Distributor()
    
    # Add nodes
    distributor.add_node("loader1", 8000, "node-1", ["192.168.1.1"], 1000)
    distributor.add_node("loader2", 8000, "node-2", ["192.168.1.2"], 1000)
    
    assert len(distributor.nodes) == 2
    assert distributor.nodes[0].name == "node-1"
    assert distributor.nodes[1].name == "node-2"
    
    print("✓ Node management test passed")


@pytest.mark.asyncio
async def test_node_selection_round_robin():
    """Test round-robin node selection"""
    distributor = Distributor()
    
    # Add nodes
    distributor.add_node("loader1", 8000, "node-1", [], 1000)
    distributor.add_node("loader2", 8000, "node-2", [], 1000)
    distributor.add_node("loader3", 8000, "node-3", [], 1000)
    
    # All nodes should be healthy initially
    for node in distributor.nodes:
        node.status = LoaderStatus.HEALTHY
    
    # Select nodes in round-robin
    selected = []
    for _ in range(6):
        node = distributor.select_node_round_robin()
        selected.append(node.name)
    
    # Should cycle through all nodes
    assert selected == ["node-1", "node-2", "node-3", "node-1", "node-2", "node-3"]
    
    print("✓ Round-robin selection test passed")


@pytest.mark.asyncio
async def test_node_selection_least_loaded():
    """Test least-loaded node selection"""
    distributor = Distributor()
    
    # Add nodes with different loads
    distributor.add_node("loader1", 8000, "node-1", [], 1000)
    distributor.add_node("loader2", 8000, "node-2", [], 1000)
    distributor.add_node("loader3", 8000, "node-3", [], 1000)
    
    # Set different loads
    distributor.nodes[0].status = LoaderStatus.HEALTHY
    distributor.nodes[0].active_connections = 500  # 50% load
    
    distributor.nodes[1].status = LoaderStatus.HEALTHY
    distributor.nodes[1].active_connections = 200  # 20% load (least)
    
    distributor.nodes[2].status = LoaderStatus.HEALTHY
    distributor.nodes[2].active_connections = 800  # 80% load
    
    # Should select node-2 (least loaded)
    node = distributor.select_node_least_loaded()
    assert node.name == "node-2"
    
    print("✓ Least-loaded selection test passed")


@pytest.mark.asyncio
async def test_node_weighting():
    """Test weighted node selection"""
    distributor = Distributor()
    
    # Add nodes
    distributor.add_node("loader1", 8000, "node-1", [], 1000)
    distributor.add_node("loader2", 8000, "node-2", [], 1000)
    
    # Node 1: Low load, high success
    distributor.nodes[0].status = LoaderStatus.HEALTHY
    distributor.nodes[0].active_connections = 100  # 10% load
    distributor.nodes[0].successful_loads = 90
    distributor.nodes[0].total_loads = 100  # 90% success
    distributor.nodes[0].avg_response_time_ms = 50
    
    # Node 2: High load, low success
    distributor.nodes[1].status = LoaderStatus.HEALTHY
    distributor.nodes[1].active_connections = 900  # 90% load
    distributor.nodes[1].successful_loads = 50
    distributor.nodes[1].total_loads = 100  # 50% success
    distributor.nodes[1].avg_response_time_ms = 500
    
    # Node 1 should have higher weight
    assert distributor.nodes[0].weight > distributor.nodes[1].weight
    
    # Weighted selection should favor node 1
    selections = {
        'node-1': 0,
        'node-2': 0,
    }
    
    for _ in range(100):
        node = distributor.select_node_weighted()
        selections[node.name] += 1
    
    # Node 1 should be selected more often
    assert selections['node-1'] > selections['node-2']
    
    print(f"✓ Weighted selection test passed (node-1: {selections['node-1']}, node-2: {selections['node-2']})")


@pytest.mark.asyncio
async def test_unavailable_nodes():
    """Test handling of unavailable nodes"""
    distributor = Distributor()
    
    # Add nodes
    distributor.add_node("loader1", 8000, "node-1", [], 1000)
    distributor.add_node("loader2", 8000, "node-2", [], 1000)
    
    # Make all nodes unhealthy
    distributor.nodes[0].status = LoaderStatus.UNHEALTHY
    distributor.nodes[1].status = LoaderStatus.UNHEALTHY
    
    # Should return None when no nodes available
    assert distributor.select_node_round_robin() is None
    assert distributor.select_node_weighted() is None
    assert distributor.select_node_least_loaded() is None
    
    print("✓ Unavailable nodes test passed")


@pytest.mark.asyncio
async def test_capacity_limits():
    """Test that nodes respect capacity limits"""
    distributor = Distributor()
    
    # Add node with small capacity
    distributor.add_node("loader1", 8000, "node-1", [], max_connections=10)
    
    node = distributor.nodes[0]
    node.status = LoaderStatus.HEALTHY
    
    # Fill to capacity
    node.active_connections = 10
    
    # Should not be available
    assert not node.is_available
    assert distributor.select_node_round_robin() is None
    
    # Free up some capacity
    node.active_connections = 5
    
    # Should be available again
    assert node.is_available
    assert distributor.select_node_round_robin() is not None
    
    print("✓ Capacity limits test passed")


@pytest.mark.asyncio
async def test_statistics():
    """Test statistics gathering"""
    distributor = Distributor()
    
    # Add nodes
    distributor.add_node("loader1", 8000, "node-1", [], 1000)
    distributor.add_node("loader2", 8000, "node-2", [], 2000)
    
    # Set loads
    distributor.nodes[0].status = LoaderStatus.HEALTHY
    distributor.nodes[0].active_connections = 500
    
    distributor.nodes[1].status = LoaderStatus.DEGRADED
    distributor.nodes[1].active_connections = 1500
    
    # Get stats
    stats = distributor.get_stats()
    
    assert stats['nodes']['total'] == 2
    assert stats['nodes']['healthy'] == 1
    assert stats['nodes']['degraded'] == 1
    assert stats['capacity']['total'] == 3000
    assert stats['capacity']['used'] == 2000
    assert stats['capacity']['available'] == 1000
    
    print("✓ Statistics test passed")


def run_all_tests():
    """Run all tests"""
    print("=================================")
    print("Distributor Test Suite")
    print("=================================\n")
    
    asyncio.run(test_node_management())
    asyncio.run(test_node_selection_round_robin())
    asyncio.run(test_node_selection_least_loaded())
    asyncio.run(test_node_weighting())
    asyncio.run(test_unavailable_nodes())
    asyncio.run(test_capacity_limits())
    asyncio.run(test_statistics())
    
    print("\n=================================")
    print("✅ All tests passed!")
    print("=================================")


if __name__ == "__main__":
    run_all_tests()
