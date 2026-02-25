#!/usr/bin/env python3
"""
Tests for Neural Architecture Search
"""

import unittest
import torch
from nas_optimizer import NASOptimizer, SearchCell


class TestNAS(unittest.TestCase):
    
    def test_search_cell_creation(self):
        """Test search cell initialization"""
        cell = SearchCell(input_dim=42, output_dim=42, num_nodes=4)
        self.assertIsNotNone(cell)
        self.assertEqual(len(cell.alphas), 6)  # 4*3/2 = 6 edges
    
    def test_nas_optimizer_creation(self):
        """Test NAS optimizer initialization"""
        nas = NASOptimizer(input_dim=42, output_dim=2, num_cells=4)
        self.assertIsNotNone(nas)
    
    def test_architecture_extraction(self):
        """Test architecture extraction from alphas"""
        cell = SearchCell(input_dim=42, output_dim=42, num_nodes=4)
        arch = cell.get_best_architecture()
        self.assertIsInstance(arch, list)
        self.assertGreater(len(arch), 0)
    
    def test_forward_pass(self):
        """Test forward pass through search network"""
        nas = NASOptimizer(input_dim=42, output_dim=2, num_cells=2)
        x = torch.randn(8, 42)  # Batch of 8
        output = nas.network(x)
        self.assertEqual(output.shape, (8, 2))


if __name__ == '__main__':
    unittest.main()
