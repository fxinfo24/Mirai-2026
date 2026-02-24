#!/usr/bin/env python3
"""
LLM Integration Module

Supports multiple LLM providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Local models (Ollama, LM Studio)
- Azure OpenAI
- Google PaLM

Used for:
- Credential generation
- Attack strategy generation
- Evasion technique suggestions
- Social engineering content
"""

import os
import json
import logging
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
from enum import Enum
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMProvider(Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    AZURE_OPENAI = "azure_openai"
    LOCAL = "local"
    OPENROUTER = "openrouter"  # ⭐ Unified API for 200+ models!


@dataclass
class LLMConfig:
    """LLM configuration"""
    provider: LLMProvider
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    model: str = "gpt-3.5-turbo"
    temperature: float = 0.7
    max_tokens: int = 1000
    timeout: int = 30


class LLMClient:
    """
    Universal LLM client supporting multiple providers
    """
    
    def __init__(self, config: LLMConfig):
        self.config = config
        self.session = requests.Session()
        
        # Set up provider-specific configuration
        if config.provider == LLMProvider.OPENAI:
            self.api_base = config.api_base or "https://api.openai.com/v1"
            self.session.headers.update({
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json"
            })
        
        elif config.provider == LLMProvider.ANTHROPIC:
            self.api_base = config.api_base or "https://api.anthropic.com/v1"
            self.session.headers.update({
                "x-api-key": config.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            })
        
        elif config.provider == LLMProvider.OLLAMA:
            self.api_base = config.api_base or "http://localhost:11434"
        
        elif config.provider == LLMProvider.LOCAL:
            self.api_base = config.api_base or "http://localhost:1234/v1"
        
        elif config.provider == LLMProvider.OPENROUTER:
            self.api_base = config.api_base or "https://openrouter.ai/api/v1"
            self.session.headers.update({
                "Authorization": f"Bearer {config.api_key}",
                "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "http://localhost"),
                "X-Title": os.getenv("OPENROUTER_APP_NAME", "Mirai-2026"),
                "Content-Type": "application/json"
            })
        
        logger.info(f"LLM client initialized: {config.provider.value}/{config.model}")
    
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text using the configured LLM
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Returns:
            Generated text
        """
        if self.config.provider == LLMProvider.OPENAI:
            return self._generate_openai(prompt, system_prompt)
        elif self.config.provider == LLMProvider.ANTHROPIC:
            return self._generate_anthropic(prompt, system_prompt)
        elif self.config.provider == LLMProvider.OLLAMA:
            return self._generate_ollama(prompt, system_prompt)
        elif self.config.provider == LLMProvider.LOCAL:
            return self._generate_openai(prompt, system_prompt)  # Local models use OpenAI API
        elif self.config.provider == LLMProvider.OPENROUTER:
            return self._generate_openai(prompt, system_prompt)  # OpenRouter uses OpenAI-compatible API
        else:
            raise ValueError(f"Unsupported provider: {self.config.provider}")
    
    def _generate_openai(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate using OpenAI API"""
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens
        }
        
        try:
            response = self.session.post(
                f"{self.api_base}/chat/completions",
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
        
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    def _generate_anthropic(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate using Anthropic Claude API"""
        payload = {
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        try:
            response = self.session.post(
                f"{self.api_base}/messages",
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            return result["content"][0]["text"]
        
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise
    
    def _generate_ollama(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate using Ollama local models"""
        payload = {
            "model": self.config.model,
            "prompt": prompt,
            "stream": False
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        try:
            response = self.session.post(
                f"{self.api_base}/api/generate",
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            return result["response"]
        
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            raise


class CredentialGenerator:
    """
    LLM-powered credential generator
    
    Uses LLMs to generate realistic default credentials based on:
    - Device type and manufacturer
    - Common password patterns
    - Breach databases
    - Historical data
    """
    
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
    
    def generate_credentials(self, 
                           device_type: str,
                           manufacturer: Optional[str] = None,
                           year: Optional[int] = None,
                           count: int = 10) -> List[Dict[str, str]]:
        """
        Generate likely default credentials for a device
        
        Args:
            device_type: Type of device (e.g., "IP Camera", "Router")
            manufacturer: Device manufacturer (e.g., "Hikvision", "TP-Link")
            year: Year of manufacture
            count: Number of credentials to generate
            
        Returns:
            List of credential dictionaries with username, password, confidence
        """
        system_prompt = """You are a cybersecurity researcher analyzing IoT device default credentials.
Your task is to generate realistic default username/password combinations based on common patterns.
Output ONLY valid JSON, no additional text."""
        
        prompt = f"""Generate {count} most likely default credentials for:
Device Type: {device_type}
Manufacturer: {manufacturer or 'Unknown'}
Year: {year or 'Unknown'}

Consider:
1. Common default credentials (root/admin, admin/admin, etc.)
2. Manufacturer-specific patterns
3. Year-based password patterns
4. Known breach database patterns

Output format (JSON only, no markdown):
[
  {{"username": "root", "password": "admin", "confidence": 0.9, "source": "common_default"}},
  {{"username": "admin", "password": "12345", "confidence": 0.7, "source": "weak_password"}}
]
"""
        
        try:
            response = self.llm.generate(prompt, system_prompt)
            
            # Clean response (remove markdown if present)
            response = response.strip()
            if response.startswith("```"):
                # Remove markdown code blocks
                lines = response.split('\n')
                response = '\n'.join(lines[1:-1]) if len(lines) > 2 else response
                response = response.replace("```json", "").replace("```", "").strip()
            
            credentials = json.loads(response)
            
            logger.info(f"Generated {len(credentials)} credentials for {device_type}")
            return credentials
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"Response: {response}")
            
            # Fallback to simple defaults
            return self._fallback_credentials(device_type)
        
        except Exception as e:
            logger.error(f"Credential generation failed: {e}")
            return self._fallback_credentials(device_type)
    
    def _fallback_credentials(self, device_type: str) -> List[Dict[str, str]]:
        """Fallback credentials if LLM fails"""
        common = [
            {"username": "root", "password": "admin", "confidence": 0.8, "source": "fallback"},
            {"username": "admin", "password": "admin", "confidence": 0.8, "source": "fallback"},
            {"username": "root", "password": "12345", "confidence": 0.7, "source": "fallback"},
            {"username": "admin", "password": "password", "confidence": 0.7, "source": "fallback"},
            {"username": "root", "password": "", "confidence": 0.6, "source": "fallback"},
        ]
        
        return common


class AttackStrategyGenerator:
    """
    LLM-powered attack strategy generator
    
    Analyzes target and generates optimal attack strategies
    """
    
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
    
    def generate_strategy(self,
                         target_info: Dict,
                         current_success_rate: float,
                         detection_rate: float) -> Dict:
        """
        Generate attack strategy based on target and current performance
        
        Args:
            target_info: Information about target (IP, ports, banners, etc.)
            current_success_rate: Current attack success rate
            detection_rate: Current detection rate
            
        Returns:
            Strategy dictionary with recommended actions
        """
        system_prompt = """You are a red team expert analyzing attack strategies.
Suggest optimal attack vectors and evasion techniques based on target characteristics.
Focus on effectiveness while minimizing detection."""
        
        prompt = f"""Analyze this target and suggest attack strategy:

Target Information:
{json.dumps(target_info, indent=2)}

Current Performance:
- Success Rate: {current_success_rate:.1%}
- Detection Rate: {detection_rate:.1%}

Suggest:
1. Best attack vector to use
2. Optimal parameters (packet size, timing, etc.)
3. Evasion techniques to employ
4. Expected success rate

Output as JSON with fields: attack_vector, parameters, evasion_techniques, expected_success
"""
        
        try:
            response = self.llm.generate(prompt, system_prompt)
            
            # Parse JSON from response
            response = response.strip()
            if response.startswith("```"):
                lines = response.split('\n')
                response = '\n'.join(lines[1:-1]) if len(lines) > 2 else response
                response = response.replace("```json", "").replace("```", "").strip()
            
            strategy = json.loads(response)
            
            logger.info(f"Generated attack strategy: {strategy.get('attack_vector')}")
            return strategy
        
        except Exception as e:
            logger.error(f"Strategy generation failed: {e}")
            return {
                "attack_vector": "tcp_syn",
                "parameters": {"intensity": 0.5},
                "evasion_techniques": ["timing_jitter"],
                "expected_success": 0.5
            }


class EvasionAdvisor:
    """
    LLM-powered evasion technique advisor
    
    Suggests evasion techniques based on detected defensive systems
    """
    
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
    
    def suggest_evasions(self,
                        detected_systems: List[str],
                        current_pattern: Dict) -> List[str]:
        """
        Suggest evasion techniques
        
        Args:
            detected_systems: List of detected defensive systems (IDS, firewall, etc.)
            current_pattern: Current attack pattern being used
            
        Returns:
            List of evasion technique suggestions
        """
        system_prompt = """You are a penetration testing expert specializing in IDS/IPS evasion.
Suggest specific, actionable evasion techniques."""
        
        prompt = f"""Detected defensive systems: {', '.join(detected_systems)}

Current attack pattern:
{json.dumps(current_pattern, indent=2)}

Suggest 5 specific evasion techniques to avoid detection. For each technique, explain:
1. What to change
2. Why it helps
3. Implementation details

Format as JSON array of objects with fields: technique, description, implementation
"""
        
        try:
            response = self.llm.generate(prompt, system_prompt)
            
            # Parse response
            response = response.strip()
            if response.startswith("```"):
                lines = response.split('\n')
                response = '\n'.join(lines[1:-1]) if len(lines) > 2 else response
                response = response.replace("```json", "").replace("```", "").strip()
            
            suggestions = json.loads(response)
            
            return [s["description"] for s in suggestions]
        
        except Exception as e:
            logger.error(f"Evasion suggestion failed: {e}")
            return [
                "Add random timing jitter between packets",
                "Randomize TTL values",
                "Use packet fragmentation",
                "Change source port selection strategy",
                "Increase payload entropy"
            ]


# Example usage and testing
if __name__ == '__main__':
    print("="*60)
    print("LLM Integration Demo")
    print("="*60)
    
    # Check for API key
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    
    if not api_key:
        print("\n⚠️  No API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY")
        print("Or use Ollama for local models: ollama serve")
        print("\nUsing fallback mode...\n")
        
        # Use Ollama if available
        config = LLMConfig(
            provider=LLMProvider.OLLAMA,
            model="llama2",
            temperature=0.7
        )
    else:
        # Use OpenAI or Anthropic
        if os.getenv("OPENAI_API_KEY"):
            config = LLMConfig(
                provider=LLMProvider.OPENAI,
                api_key=os.getenv("OPENAI_API_KEY"),
                model="gpt-3.5-turbo",
                temperature=0.7
            )
        else:
            config = LLMConfig(
                provider=LLMProvider.ANTHROPIC,
                api_key=os.getenv("ANTHROPIC_API_KEY"),
                model="claude-3-sonnet-20240229",
                temperature=0.7
            )
    
    try:
        client = LLMClient(config)
        
        # Test 1: Credential Generation
        print("\n" + "="*60)
        print("Test 1: Credential Generation")
        print("="*60)
        
        cred_gen = CredentialGenerator(client)
        credentials = cred_gen.generate_credentials(
            device_type="IP Camera",
            manufacturer="Hikvision",
            year=2020,
            count=5
        )
        
        print(f"\nGenerated {len(credentials)} credentials:")
        for cred in credentials:
            print(f"  {cred['username']}:{cred['password']} "
                  f"(confidence: {cred['confidence']:.2f})")
        
        # Test 2: Attack Strategy
        print("\n" + "="*60)
        print("Test 2: Attack Strategy Generation")
        print("="*60)
        
        strategy_gen = AttackStrategyGenerator(client)
        strategy = strategy_gen.generate_strategy(
            target_info={
                "ip": "192.168.1.100",
                "open_ports": [80, 443, 23],
                "banner": "nginx/1.18.0",
                "response_time_ms": 45
            },
            current_success_rate=0.6,
            detection_rate=0.3
        )
        
        print("\nRecommended strategy:")
        print(f"  Attack Vector: {strategy.get('attack_vector')}")
        print(f"  Parameters: {strategy.get('parameters')}")
        print(f"  Expected Success: {strategy.get('expected_success')}")
        
        # Test 3: Evasion Suggestions
        print("\n" + "="*60)
        print("Test 3: Evasion Technique Suggestions")
        print("="*60)
        
        evasion_advisor = EvasionAdvisor(client)
        suggestions = evasion_advisor.suggest_evasions(
            detected_systems=["Snort IDS", "pfSense firewall"],
            current_pattern={
                "packet_size": 512,
                "inter_packet_delay_ms": 0,
                "payload_entropy": 0.5
            }
        )
        
        print("\nEvasion suggestions:")
        for i, suggestion in enumerate(suggestions, 1):
            print(f"  {i}. {suggestion}")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nFalling back to mock mode...")
        
        # Show what would happen with a working LLM
        print("\nMock Credentials:")
        print("  root:xc3511 (confidence: 0.90)")
        print("  admin:admin (confidence: 0.85)")
        print("  root:12345 (confidence: 0.75)")
    
    print("\n" + "="*60)
    print("Demo complete!")
    print("="*60)
