#!/usr/bin/env python3
"""
ML-based pattern evasion and attack optimization

This module uses machine learning to:
1. Generate adaptive attack patterns that evade detection
2. Learn from blocked/detected attacks
3. Optimize packet characteristics for maximum effectiveness
"""

import json
import random
import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AttackPattern:
    """Represents an attack pattern"""
    packet_size_range: Tuple[int, int]
    inter_packet_delay_ms: int
    ttl_range: Tuple[int, int]
    source_port_strategy: str  # 'random', 'sequential', 'fixed'
    fragmentation: bool
    payload_entropy: float  # 0.0 to 1.0
    tcp_flags: List[str]
    effectiveness_score: float = 0.5


class PatternEvolutionEngine:
    """
    Evolves attack patterns using genetic algorithm principles
    """
    
    def __init__(self, population_size: int = 50):
        self.population_size = population_size
        self.population: List[AttackPattern] = []
        self.generation = 0
        self.best_patterns: List[AttackPattern] = []
        
    def initialize_population(self):
        """Create initial random population"""
        logger.info(f"Initializing population of {self.population_size} patterns")
        
        for _ in range(self.population_size):
            pattern = AttackPattern(
                packet_size_range=(
                    random.randint(64, 512),
                    random.randint(512, 1500)
                ),
                inter_packet_delay_ms=random.randint(0, 100),
                ttl_range=(random.randint(32, 128), random.randint(128, 255)),
                source_port_strategy=random.choice(['random', 'sequential', 'fixed']),
                fragmentation=random.choice([True, False]),
                payload_entropy=random.uniform(0.3, 1.0),
                tcp_flags=random.sample(['SYN', 'ACK', 'PSH', 'URG', 'FIN'], 
                                       k=random.randint(1, 3)),
                effectiveness_score=0.5
            )
            self.population.append(pattern)
    
    def evaluate_pattern(self, pattern: AttackPattern, 
                        detection_rate: float,
                        throughput_pps: int) -> float:
        """
        Evaluate pattern effectiveness based on detection evasion and throughput
        
        Args:
            pattern: Pattern to evaluate
            detection_rate: How often this pattern was detected (0.0-1.0)
            throughput_pps: Packets per second achieved
            
        Returns:
            Effectiveness score (higher is better)
        """
        # Lower detection rate is better
        evasion_score = 1.0 - detection_rate
        
        # Higher throughput is better (normalized to 0-1)
        throughput_score = min(throughput_pps / 100000.0, 1.0)
        
        # Entropy bonus (more random is harder to fingerprint)
        entropy_bonus = pattern.payload_entropy * 0.1
        
        # Combined score (weighted)
        score = (evasion_score * 0.6 + 
                throughput_score * 0.3 + 
                entropy_bonus * 0.1)
        
        return score
    
    def mutate_pattern(self, pattern: AttackPattern) -> AttackPattern:
        """Create mutated version of pattern"""
        mutated = AttackPattern(
            packet_size_range=pattern.packet_size_range,
            inter_packet_delay_ms=pattern.inter_packet_delay_ms,
            ttl_range=pattern.ttl_range,
            source_port_strategy=pattern.source_port_strategy,
            fragmentation=pattern.fragmentation,
            payload_entropy=pattern.payload_entropy,
            tcp_flags=pattern.tcp_flags.copy(),
            effectiveness_score=pattern.effectiveness_score
        )
        
        # Randomly mutate one aspect
        mutation = random.choice([
            'packet_size', 'delay', 'ttl', 'port_strategy', 
            'fragmentation', 'entropy', 'flags'
        ])
        
        if mutation == 'packet_size':
            delta = random.randint(-200, 200)
            mutated.packet_size_range = (
                max(64, pattern.packet_size_range[0] + delta),
                min(1500, pattern.packet_size_range[1] + delta)
            )
        elif mutation == 'delay':
            mutated.inter_packet_delay_ms = max(0, 
                pattern.inter_packet_delay_ms + random.randint(-20, 20))
        elif mutation == 'ttl':
            delta = random.randint(-10, 10)
            mutated.ttl_range = (
                max(1, pattern.ttl_range[0] + delta),
                min(255, pattern.ttl_range[1] + delta)
            )
        elif mutation == 'port_strategy':
            mutated.source_port_strategy = random.choice(
                ['random', 'sequential', 'fixed'])
        elif mutation == 'fragmentation':
            mutated.fragmentation = not pattern.fragmentation
        elif mutation == 'entropy':
            mutated.payload_entropy = max(0.0, min(1.0, 
                pattern.payload_entropy + random.uniform(-0.2, 0.2)))
        elif mutation == 'flags':
            if random.random() > 0.5 and len(mutated.tcp_flags) > 1:
                mutated.tcp_flags.pop()
            else:
                new_flag = random.choice(['SYN', 'ACK', 'PSH', 'URG', 'FIN', 'RST'])
                if new_flag not in mutated.tcp_flags:
                    mutated.tcp_flags.append(new_flag)
        
        return mutated
    
    def crossover(self, parent1: AttackPattern, 
                  parent2: AttackPattern) -> AttackPattern:
        """Create offspring from two parents"""
        offspring = AttackPattern(
            packet_size_range=random.choice([
                parent1.packet_size_range, parent2.packet_size_range]),
            inter_packet_delay_ms=random.choice([
                parent1.inter_packet_delay_ms, parent2.inter_packet_delay_ms]),
            ttl_range=random.choice([parent1.ttl_range, parent2.ttl_range]),
            source_port_strategy=random.choice([
                parent1.source_port_strategy, parent2.source_port_strategy]),
            fragmentation=random.choice([
                parent1.fragmentation, parent2.fragmentation]),
            payload_entropy=np.mean([
                parent1.payload_entropy, parent2.payload_entropy]),
            tcp_flags=random.choice([parent1.tcp_flags, parent2.tcp_flags]).copy(),
            effectiveness_score=0.5
        )
        return offspring
    
    def evolve(self, feedback: List[Dict]) -> AttackPattern:
        """
        Evolve population based on feedback
        
        Args:
            feedback: List of dicts with pattern performance data
                     {'pattern_id': int, 'detection_rate': float, 'throughput': int}
        
        Returns:
            Best evolved pattern
        """
        # Update scores based on feedback
        for fb in feedback:
            pattern_id = fb.get('pattern_id', 0)
            if pattern_id < len(self.population):
                pattern = self.population[pattern_id]
                pattern.effectiveness_score = self.evaluate_pattern(
                    pattern,
                    fb.get('detection_rate', 0.5),
                    fb.get('throughput', 10000)
                )
        
        # Sort by effectiveness
        self.population.sort(key=lambda p: p.effectiveness_score, reverse=True)
        
        # Keep top 25%
        elite_size = self.population_size // 4
        elite = self.population[:elite_size]
        
        logger.info(f"Generation {self.generation}: Best score = {elite[0].effectiveness_score:.3f}")
        
        # Create next generation
        new_population = elite.copy()
        
        # Crossover to create rest of population
        while len(new_population) < self.population_size:
            parent1 = random.choice(elite)
            parent2 = random.choice(elite)
            offspring = self.crossover(parent1, parent2)
            
            # Mutate with 30% probability
            if random.random() < 0.3:
                offspring = self.mutate_pattern(offspring)
            
            new_population.append(offspring)
        
        self.population = new_population
        self.generation += 1
        
        # Track best patterns
        if elite[0] not in self.best_patterns:
            self.best_patterns.append(elite[0])
        
        return elite[0]
    
    def get_best_pattern(self) -> AttackPattern:
        """Get current best pattern"""
        if not self.population:
            self.initialize_population()
        
        return max(self.population, key=lambda p: p.effectiveness_score)
    
    def pattern_to_dict(self, pattern: AttackPattern) -> Dict:
        """Convert pattern to JSON-serializable dict"""
        return {
            'packet_size_min': pattern.packet_size_range[0],
            'packet_size_max': pattern.packet_size_range[1],
            'inter_packet_delay_ms': pattern.inter_packet_delay_ms,
            'ttl_min': pattern.ttl_range[0],
            'ttl_max': pattern.ttl_range[1],
            'source_port_strategy': pattern.source_port_strategy,
            'fragmentation': pattern.fragmentation,
            'payload_entropy': pattern.payload_entropy,
            'tcp_flags': pattern.tcp_flags,
            'effectiveness_score': pattern.effectiveness_score
        }
    
    def save_state(self, filepath: str):
        """Save engine state to file"""
        state = {
            'generation': self.generation,
            'population': [self.pattern_to_dict(p) for p in self.population],
            'best_patterns': [self.pattern_to_dict(p) for p in self.best_patterns]
        }
        
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
        
        logger.info(f"Saved state to {filepath}")


class SignatureEvader:
    """
    Evade signature-based detection systems
    """
    
    def __init__(self):
        self.known_signatures = []
        self.evasion_techniques = [
            'payload_randomization',
            'timing_jitter',
            'packet_fragmentation',
            'protocol_obfuscation',
            'ttl_manipulation',
            'header_field_randomization'
        ]
    
    def learn_signature(self, signature: Dict):
        """Learn a detection signature to evade"""
        self.known_signatures.append(signature)
        logger.info(f"Learned new signature: {signature.get('name', 'unknown')}")
    
    def suggest_evasions(self, current_pattern: Dict) -> List[str]:
        """Suggest evasion techniques for current pattern"""
        suggestions = []
        
        # Check payload characteristics
        if current_pattern.get('payload_entropy', 0) < 0.7:
            suggestions.append(
                "Increase payload entropy to >0.7 to evade content inspection"
            )
        
        # Check timing
        if current_pattern.get('inter_packet_delay_ms', 0) == 0:
            suggestions.append(
                "Add random timing jitter (5-50ms) to evade rate-based detection"
            )
        
        # Check fragmentation
        if not current_pattern.get('fragmentation', False):
            suggestions.append(
                "Enable packet fragmentation to bypass simple DPI"
            )
        
        # Check TTL
        ttl_min = current_pattern.get('ttl_min', 64)
        if ttl_min == 64:
            suggestions.append(
                "Randomize TTL values to evade fingerprinting"
            )
        
        # Check source port strategy
        if current_pattern.get('source_port_strategy') == 'fixed':
            suggestions.append(
                "Use random source ports to evade flow-based tracking"
            )
        
        return suggestions


# Example usage
if __name__ == '__main__':
    # Initialize evolution engine
    engine = PatternEvolutionEngine(population_size=30)
    engine.initialize_population()
    
    # Simulate evolution over multiple generations
    print("Simulating pattern evolution...")
    
    for gen in range(10):
        # Simulate feedback (in reality, this comes from actual attack results)
        feedback = []
        for i in range(len(engine.population)):
            feedback.append({
                'pattern_id': i,
                'detection_rate': random.uniform(0.1, 0.9),
                'throughput': random.randint(5000, 50000)
            })
        
        best = engine.evolve(feedback)
        
        if gen % 3 == 0:
            print(f"\nGeneration {gen}:")
            print(f"  Best pattern score: {best.effectiveness_score:.3f}")
            print(f"  Packet size: {best.packet_size_range}")
            print(f"  Delay: {best.inter_packet_delay_ms}ms")
            print(f"  Entropy: {best.payload_entropy:.2f}")
    
    # Save state
    engine.save_state('/tmp/pattern_evolution_state.json')
    
    # Test signature evader
    print("\n" + "="*50)
    print("Testing signature evasion...")
    
    evader = SignatureEvader()
    
    current = engine.pattern_to_dict(engine.get_best_pattern())
    suggestions = evader.suggest_evasions(current)
    
    print("\nEvasion suggestions:")
    for i, suggestion in enumerate(suggestions, 1):
        print(f"  {i}. {suggestion}")
