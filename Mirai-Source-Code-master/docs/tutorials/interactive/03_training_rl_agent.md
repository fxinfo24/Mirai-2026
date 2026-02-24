# Interactive Tutorial 3: Training the Reinforcement Learning Agent

## Overview

Train and test the adaptive RL agent that learns optimal attack strategies.

**Time**: ~25 minutes  
**Prerequisites**: Tutorials 1 & 2 completed  
**Goal**: Train an agent that learns from experience

---

## Part 1: Understanding RL Basics (5 min)

### What is Reinforcement Learning?

The bot learns through trial and error:
- **State**: Current network conditions (detection rate, success rate, etc.)
- **Action**: What attack strategy to use
- **Reward**: How well did the action work?
- **Learning**: Improve strategy based on rewards

### The Q-Learning Algorithm

```
Q(state, action) = Q(state, action) + α[reward + γ·max(Q(next_state, a)) - Q(state, action)]

Where:
- α = learning rate (0.1)
- γ = discount factor (0.95)
- Q = expected future rewards
```

---

## Part 2: Training the Basic Agent (10 min)

### Step 1: Navigate to RL Directory

```bash
cd ai/reinforcement_learning/
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Run Training

```bash
python adaptive_agent.py
```

**Expected output**:
```
Training adaptive agent...
Episode 0/100: reward=45.23, steps=42, success_rate=0.52
Episode 10/100: reward=145.67, steps=38, success_rate=0.65
Episode 50/100: reward=223.45, steps=35, success_rate=0.78
Episode 100/100: reward=301.23, steps=32, success_rate=0.91

Training complete! Best reward: 301.23
Model saved to /tmp/adaptive_agent.json
```

### Step 4: Analyze Learning Progress

```bash
# View the saved model
cat /tmp/adaptive_agent.json | python -m json.tool | head -50
```

**What you should see**:
- Q-table with state-action values
- Statistics showing improvement over time
- Best performing strategies

---

## Part 3: Testing the Trained Agent (5 min)

### Test in Exploitation Mode

```python
# Create test script: test_agent.py
from adaptive_agent import AdaptiveAgent, BotState

# Load trained agent
agent = AdaptiveAgent()
agent.load_model('/tmp/adaptive_agent.json')

# Test state
test_state = BotState(
    detection_rate=0.3,
    success_rate=0.5,
    active_connections=100,
    packets_sent_per_sec=1000,
    bandwidth_utilization=0.6,
    time_since_last_detection=300,
    target_response_time=75.0,
    is_honeypot_suspected=False
)

# Get best action (no exploration)
action = agent.get_action(test_state, explore=False)

print(f"Recommended action:")
print(f"  Attack Vector: {action.attack_vector}")
print(f"  Intensity: {action.intensity:.2f}")
print(f"  Evasion Level: {action.evasion_level}")
```

Run it:
```bash
python test_agent.py
```

---

## Part 4: Advanced Training with DNN (10 min)

### Train Deep Neural Network Agent

```bash
cd ai/deep_learning/
pip install -r requirements.txt

# Train DNN agent
python dnn_evasion_model.py
```

**Expected output**:
```
Training Deep Neural Network Evasion Agent
============================================================
Episode 0/500: Reward=123.45, Best=123.45, Epsilon=1.000
Episode 50/500: Reward=234.56, Best=289.12, Epsilon=0.606
Episode 100/500: Reward=345.67, Best=398.23, Epsilon=0.367
...
Episode 500/500: Reward=456.78, Best=502.34, Epsilon=0.010

Training complete! Best reward: 502.34
Model saved to /tmp/dnn_evasion_model.h5
```

### Compare Performance

| Agent Type | Avg Reward | Training Time | Memory |
|-----------|-----------|---------------|---------|
| Q-Learning | 301.23 | ~30 sec | 2 MB |
| DNN | 502.34 | ~5 min | 50 MB |

**DNN advantages**:
- Better generalization to unseen states
- Higher rewards (better performance)
- Automatic feature learning

**Q-Learning advantages**:
- Faster training
- Smaller model size
- Easier to interpret

---

## Part 5: Federated Learning (5 min)

### Simulate Multi-Bot Learning

```bash
cd ai/federated_learning/

# Run federated learning simulation
python federated_agent.py
```

**What happens**:
1. 20 bots train locally on their experiences
2. Each bot sends model updates to C&C
3. C&C aggregates updates (weighted by performance)
4. New global model distributed back to bots
5. Repeat for multiple rounds

**Expected output**:
```
Federated Learning Simulation
============================================================
Simulating 20 bots training locally...

Round 1: Local training
Accepted update from bot_000 (67 samples)
Accepted update from bot_001 (42 samples)
...
Aggregating 20 updates
New global model v1: success=0.62, detection=0.25

Round 2: Bots receive global model and train again
...
New global model v2: success=0.78, detection=0.15

Federated learning complete!
Performance improvement: 0.50 → 0.78
```

### Advantages of Federated Learning

- **Privacy**: Raw attack data never leaves bot
- **Speed**: Learning from 1000s of bots simultaneously
- **Resilience**: Loss of individual bots doesn't affect learning
- **Robustness**: Detects and rejects malicious updates

---

## Part 6: Visualizing Learning

### Plot Training Progress

```python
import matplotlib.pyplot as plt
import json

# Load training history
with open('/tmp/adaptive_agent.json') as f:
    data = json.load(f)

stats = data['stats']

# Plot rewards over time
plt.figure(figsize=(12, 4))

plt.subplot(1, 3, 1)
plt.plot(rewards_per_episode)
plt.title('Rewards Over Time')
plt.xlabel('Episode')
plt.ylabel('Total Reward')

plt.subplot(1, 3, 2)
plt.plot(success_rates)
plt.title('Success Rate')
plt.xlabel('Episode')
plt.ylabel('Success Rate')

plt.subplot(1, 3, 3)
plt.plot(detection_rates)
plt.title('Detection Rate')
plt.xlabel('Episode')
plt.ylabel('Detection Rate')

plt.tight_layout()
plt.savefig('training_progress.png')
print("Saved to training_progress.png")
```

---

## Hands-On Exercises

### Exercise 1: Modify Reward Function

Edit `adaptive_agent.py`:

```python
def calculate_reward(self, state, action, next_state):
    reward = 0.0
    
    # YOUR MODIFICATIONS HERE
    # Try different reward structures:
    
    # Option A: Prioritize stealth over success
    reward += (next_state.success_rate - state.success_rate) * 50  # Reduce success weight
    reward -= (next_state.detection_rate - state.detection_rate) * 300  # Increase detection penalty
    
    # Option B: Maximize efficiency
    if next_state.success_rate > 0.8 and next_state.bandwidth_utilization < 0.5:
        reward += 50  # Bonus for efficiency
    
    return reward
```

Retrain and compare results!

### Exercise 2: Custom State Space

Add new state features:

```python
@dataclass
class BotState:
    # Existing features
    detection_rate: float
    success_rate: float
    
    # NEW: Add your own features
    target_uptime: int           # Target's uptime
    response_consistency: float  # How consistent are responses?
    network_latency: float       # Network conditions
```

### Exercise 3: Multi-Agent Comparison

```python
# Train 3 agents with different strategies
agent_aggressive = AdaptiveAgent(epsilon=0.5)  # More exploration
agent_conservative = AdaptiveAgent(epsilon=0.1)  # Less exploration
agent_adaptive = AdaptiveAgent(epsilon=0.3)  # Balanced

# Compare performance
for agent, name in [(agent_aggressive, "Aggressive"),
                    (agent_conservative, "Conservative"),
                    (agent_adaptive, "Adaptive")]:
    rewards = train_and_evaluate(agent)
    print(f"{name}: avg_reward={np.mean(rewards):.2f}")
```

---

## Part 7: Integration with Detection Engine

### Connect RL Agent to Detection System

```python
from detection_engine import detection_check_ids_ips
from adaptive_agent import AdaptiveAgent

agent = AdaptiveAgent()
agent.load_model('trained_model.json')

# Bot operation loop
while True:
    # Get current state
    state = get_current_state()
    
    # Select action using RL agent
    action = agent.get_action(state)
    
    # Execute action
    execute_attack(action)
    
    # Check for detection
    detected = detection_check_ids_ips(packets_sent, packets_dropped)
    
    if detected:
        # Get next state after detection
        next_state = get_current_state()
        
        # Calculate reward (negative for detection)
        reward = -200  # Detection penalty
        
        # Learn from this experience
        agent.learn(state, action, reward, next_state)
        
        # Agent now knows this action led to detection
```

---

## Summary

You've learned:
✅ How RL agents learn from experience  
✅ How to train Q-Learning agents  
✅ How to train Deep Neural Network agents  
✅ How federated learning works  
✅ How to customize reward functions  
✅ How to integrate RL with detection  

**Next**: [Tutorial 4: Deploying to Kubernetes →](04_kubernetes_deployment.md)

---

## Troubleshooting

**Training stuck at low rewards?**
- Increase learning rate (0.1 → 0.2)
- Increase exploration rate (epsilon)
- Check reward function is returning varied values

**Agent not improving?**
- May need more episodes (100 → 500)
- Try different hyperparameters
- Verify experience replay is working

**Memory errors with DNN?**
- Reduce batch size (64 → 32)
- Reduce network size
- Close other applications

---

## Additional Resources

- Q-Learning paper: Watkins & Dayan (1992)
- DQN paper: Mnih et al. (2015)
- Federated Learning: McMahan et al. (2017)
- `ai/reinforcement_learning/` - Source code
- `ai/deep_learning/` - DNN implementation
- `ai/federated_learning/` - Federated implementation
