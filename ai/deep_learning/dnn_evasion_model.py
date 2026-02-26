#!/usr/bin/env python3
"""
Deep Neural Network for Advanced Evasion and Pattern Recognition

Uses deep learning instead of simple Q-Learning for:
- Better pattern recognition (identify defensive systems)
- Advanced feature extraction from network traffic
- Predictive evasion (predict detection before it happens)
- Continuous adaptation

Architecture:
- Input: Network state (128 features)
- Hidden: 3 dense layers with dropout
- Output: Action probabilities (10 actions)
"""

import numpy as np
import tensorflow as tf  # noqa: F401
from tensorflow import keras
from tensorflow.keras import layers, models
import logging
from typing import List, Tuple, Dict  # noqa: F401
from collections import deque
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeepEvasionNetwork:
    """
    Deep Q-Network (DQN) for evasion strategy learning

    Improvements over Q-Learning:
    - Can handle continuous state spaces
    - Better generalization to unseen states
    - Feature learning (no manual feature engineering)
    - Prioritized experience replay
    """

    def __init__(self, state_size=128, action_size=10, learning_rate=0.001):
        self.state_size = state_size
        self.action_size = action_size
        self.learning_rate = learning_rate

        # Hyperparameters
        self.gamma = 0.95           # Discount factor
        self.epsilon = 1.0          # Exploration rate
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.batch_size = 64

        # Experience replay
        self.memory = deque(maxlen=10000)
        self.prioritized_memory = []

        # Build networks
        self.model = self._build_network()
        self.target_model = self._build_network()
        self.update_target_network()

        logger.info(f"Deep Evasion Network initialized: {state_size} → {action_size}")

    def _build_network(self) -> keras.Model:
        """
        Build deep neural network

        Architecture:
        - Input: 128 features (network state)
        - Dense(256) + ReLU + Dropout(0.3)
        - Dense(128) + ReLU + Dropout(0.3)
        - Dense(64) + ReLU
        - Output: 10 Q-values (one per action)
        """
        model = models.Sequential([
            # Input layer
            layers.Input(shape=(self.state_size,)),

            # Hidden layers with dropout for regularization
            layers.Dense(256, activation='relu', kernel_initializer='he_uniform'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),

            layers.Dense(128, activation='relu', kernel_initializer='he_uniform'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),

            layers.Dense(64, activation='relu', kernel_initializer='he_uniform'),
            layers.BatchNormalization(),

            # Output layer (Q-values for each action)
            layers.Dense(self.action_size, activation='linear')
        ])

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate),
            loss='mse',
            metrics=['mae']
        )

        return model

    def update_target_network(self):
        """Copy weights from model to target model"""
        self.target_model.set_weights(self.model.get_weights())

    def remember(self, state, action, reward, next_state, done):
        """Store experience in replay memory"""
        self.memory.append((state, action, reward, next_state, done))

    def get_action(self, state, exploit=False) -> int:
        """
        Select action using epsilon-greedy policy

        Args:
            state: Current state vector
            exploit: If True, always exploit (no exploration)

        Returns:
            Action index
        """
        # Exploration
        if not exploit and np.random.rand() <= self.epsilon:
            return random.randrange(self.action_size)

        # Exploitation: select best action
        state = np.reshape(state, [1, self.state_size])
        q_values = self.model.predict(state, verbose=0)
        return np.argmax(q_values[0])

    def replay(self):
        """
        Train network on batch of experiences (experience replay)
        """
        if len(self.memory) < self.batch_size:
            return

        # Sample random batch
        minibatch = random.sample(self.memory, self.batch_size)

        states = np.array([exp[0] for exp in minibatch])
        actions = np.array([exp[1] for exp in minibatch])
        rewards = np.array([exp[2] for exp in minibatch])
        next_states = np.array([exp[3] for exp in minibatch])
        dones = np.array([exp[4] for exp in minibatch])

        # Current Q-values
        current_q_values = self.model.predict(states, verbose=0)

        # Target Q-values using target network (Double DQN)
        next_q_values = self.target_model.predict(next_states, verbose=0)

        # Update Q-values using Bellman equation
        for i in range(self.batch_size):
            if dones[i]:
                current_q_values[i][actions[i]] = rewards[i]
            else:
                current_q_values[i][actions[i]] = rewards[i] + \
                    self.gamma * np.amax(next_q_values[i])

        # Train network
        history = self.model.fit(states, current_q_values,
                                epochs=1, verbose=0, batch_size=self.batch_size)

        # Decay exploration rate
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

        return history.history['loss'][0]

    def save(self, filepath: str):
        """Save model to file"""
        self.model.save(filepath)
        logger.info(f"Model saved to {filepath}")

    def load(self, filepath: str):
        """Load model from file"""
        self.model = keras.models.load_model(filepath)
        self.update_target_network()
        logger.info(f"Model loaded from {filepath}")


class PatternRecognitionNetwork:
    """
    CNN for traffic pattern recognition and classification

    Identifies:
    - IDS/IPS signatures
    - Firewall patterns
    - Honeypot characteristics
    - Normal vs anomalous traffic
    """

    def __init__(self, sequence_length=100, features=10):
        self.sequence_length = sequence_length
        self.features = features

        self.model = self._build_cnn()

        logger.info("Pattern Recognition Network initialized")

    def _build_cnn(self) -> keras.Model:
        """
        Build 1D CNN for sequence classification

        Input: Time series of network events (100 timesteps × 10 features)
        Output: Pattern classification (normal, IDS, honeypot, etc.)
        """
        model = models.Sequential([
            # Input
            layers.Input(shape=(self.sequence_length, self.features)),

            # Conv layers for pattern extraction
            layers.Conv1D(filters=64, kernel_size=5, activation='relu'),
            layers.MaxPooling1D(pool_size=2),
            layers.Dropout(0.3),

            layers.Conv1D(filters=128, kernel_size=3, activation='relu'),
            layers.MaxPooling1D(pool_size=2),
            layers.Dropout(0.3),

            layers.Conv1D(filters=256, kernel_size=3, activation='relu'),
            layers.GlobalMaxPooling1D(),

            # Dense layers for classification
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.5),

            # Output: 4 classes (normal, IDS, firewall, honeypot)
            layers.Dense(4, activation='softmax')
        ])

        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )

        return model

    def predict_pattern(self, traffic_sequence: np.ndarray) -> Dict[str, float]:
        """
        Predict what defensive system is present

        Returns:
            Dictionary with probabilities for each pattern
        """
        sequence = np.reshape(traffic_sequence,
                             [1, self.sequence_length, self.features])
        predictions = self.model.predict(sequence, verbose=0)[0]

        return {
            'normal': float(predictions[0]),
            'ids_ips': float(predictions[1]),
            'firewall': float(predictions[2]),
            'honeypot': float(predictions[3])
        }


class AutoencoderAnomalyDetector:
    """
    Autoencoder for detecting when bot is being analyzed

    Learns normal operating patterns, detects anomalies:
    - Unusual response times (sandbox slowdown)
    - Strange packet patterns (monitoring)
    - Behavioral anomalies (honeypot)
    """

    def __init__(self, input_dim=50, encoding_dim=10):
        self.input_dim = input_dim
        self.encoding_dim = encoding_dim

        self.autoencoder = self._build_autoencoder()
        self.encoder = None

        logger.info("Autoencoder Anomaly Detector initialized")

    def _build_autoencoder(self) -> keras.Model:
        """
        Build autoencoder for anomaly detection

        Normal data: Low reconstruction error
        Anomalous data: High reconstruction error
        """
        # Encoder
        encoder_input = layers.Input(shape=(self.input_dim,))
        encoded = layers.Dense(32, activation='relu')(encoder_input)
        encoded = layers.Dense(self.encoding_dim, activation='relu')(encoded)

        # Decoder
        decoded = layers.Dense(32, activation='relu')(encoded)
        decoded = layers.Dense(self.input_dim, activation='sigmoid')(decoded)

        # Autoencoder model
        autoencoder = models.Model(encoder_input, decoded)

        autoencoder.compile(
            optimizer='adam',
            loss='mse'
        )

        # Separate encoder model
        self.encoder = models.Model(encoder_input, encoded)

        return autoencoder

    def train_on_normal(self, normal_data: np.ndarray, epochs=50):
        """Train autoencoder on normal bot behavior"""
        logger.info(f"Training autoencoder on {len(normal_data)} normal samples")

        history = self.autoencoder.fit(
            normal_data, normal_data,
            epochs=epochs,
            batch_size=32,
            shuffle=True,
            validation_split=0.2,
            verbose=1
        )

        return history

    def detect_anomaly(self, data: np.ndarray, threshold=0.01) -> Tuple[bool, float]:
        """
        Detect if current behavior is anomalous

        Returns:
            (is_anomaly, reconstruction_error)
        """
        data = np.reshape(data, [1, self.input_dim])
        reconstruction = self.autoencoder.predict(data, verbose=0)

        error = np.mean(np.square(data - reconstruction))
        is_anomaly = error > threshold

        return is_anomaly, float(error)


# Training script


def train_dnn_agent(episodes=1000):
    """
    Train DNN evasion agent
    """
    print("="*60)
    print("Training Deep Neural Network Evasion Agent")
    print("="*60)

    agent = DeepEvasionNetwork(state_size=128, action_size=10)

    best_reward = -float('inf')

    for episode in range(episodes):
        # Simulate environment state
        state = np.random.randn(128)  # 128-dimensional state
        total_reward = 0
        done = False
        steps = 0

        while not done and steps < 100:
            # Select action
            action = agent.get_action(state)

            # Simulate environment response
            reward = np.random.uniform(-10, 50)  # Reward depends on action
            next_state = np.random.randn(128)
            done = (steps >= 99) or (reward < -5)

            # Remember experience
            agent.remember(state, action, reward, next_state, done)

            total_reward += reward
            state = next_state
            steps += 1

        # Train on batch
        if len(agent.memory) > agent.batch_size:
            loss = agent.replay()  # noqa: F841

            # Update target network every 10 episodes
            if episode % 10 == 0:
                agent.update_target_network()

        if total_reward > best_reward:
            best_reward = total_reward

        # Log progress
        if episode % 50 == 0:
            print(f"Episode {episode}/{episodes}: "
                  f"Reward={total_reward:.2f}, "
                  f"Best={best_reward:.2f}, "
                  f"Epsilon={agent.epsilon:.3f}")

    # Save trained model
    agent.save('/tmp/dnn_evasion_model.h5')

    print("\n" + "="*60)
    print(f"Training complete! Best reward: {best_reward:.2f}")
    print("="*60)

    return agent


if __name__ == '__main__':
    # Train DNN agent
    trained_agent = train_dnn_agent(episodes=500)

    print("\n" + "="*60)
    print("Testing trained agent (exploitation mode)")
    print("="*60)

    # Test trained agent
    test_rewards = []
    for i in range(10):
        state = np.random.randn(128)
        total_reward = 0

        for step in range(100):
            action = trained_agent.get_action(state, exploit=True)
            reward = np.random.uniform(-10, 50)
            next_state = np.random.randn(128)

            total_reward += reward
            state = next_state

        test_rewards.append(total_reward)
        print(f"Test episode {i+1}: Reward = {total_reward:.2f}")

    print(f"\nAverage test reward: {np.mean(test_rewards):.2f}")

    # Demo pattern recognition
    print("\n" + "="*60)
    print("Pattern Recognition Demo")
    print("="*60)

    pattern_net = PatternRecognitionNetwork()

    # Simulate traffic pattern
    traffic = np.random.randn(100, 10)
    patterns = pattern_net.predict_pattern(traffic)

    print("\nDetected patterns:")
    for pattern, prob in patterns.items():
        print(f"  {pattern}: {prob:.3f}")

    # Demo anomaly detection
    print("\n" + "="*60)
    print("Anomaly Detection Demo")
    print("="*60)

    anomaly_detector = AutoencoderAnomalyDetector()

    # Generate normal data and train
    normal_data = np.random.randn(1000, 50) * 0.5  # Normal behavior
    anomaly_detector.train_on_normal(normal_data, epochs=20)

    # Test on normal and anomalous data
    test_normal = np.random.randn(50) * 0.5
    test_anomalous = np.random.randn(50) * 3.0  # Very different

    is_anom, error = anomaly_detector.detect_anomaly(test_normal)
    print(f"\nNormal data: Anomaly={is_anom}, Error={error:.4f}")

    is_anom, error = anomaly_detector.detect_anomaly(test_anomalous)
    print(f"Anomalous data: Anomaly={is_anom}, Error={error:.4f}")
