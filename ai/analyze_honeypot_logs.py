#!/usr/bin/env python3
"""
Honeypot Log Analysis Tool - Mirai 2026

Purpose: Analyze Cowrie honeypot logs to extract threat intelligence

Features:
- Credential extraction and statistics
- Command frequency analysis
- Malware sample tracking
- Attack pattern recognition
- Threat intelligence generation

Usage:
    python3 analyze_honeypot_logs.py /path/to/cowrie.json
"""

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from typing import List, Dict, Set
import re

class HoneypotAnalyzer:
    """Analyze honeypot logs for security research"""
    
    def __init__(self, logfile: str):
        self.logfile = logfile
        self.credentials: List[Dict] = []
        self.commands: List[str] = []
        self.downloads: List[Dict] = []
        self.sessions: Dict[str, Dict] = {}
        self.attack_ips: Set[str] = set()
        
    def analyze(self):
        """Main analysis function"""
        print(f"[*] Analyzing honeypot logs: {self.logfile}")
        print()
        
        with open(self.logfile, 'r') as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    self._process_event(event)
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    print(f"Warning: {e}")
                    continue
        
        self._print_statistics()
        self._print_top_credentials()
        self._print_top_commands()
        self._print_malware_downloads()
        self._print_attack_patterns()
        self._generate_threat_intelligence()
        
    def _process_event(self, event: Dict):
        """Process individual log event"""
        event_id = event.get('eventid', '')
        
        # Login attempts
        if event_id == 'cowrie.login.failed':
            self.credentials.append({
                'username': event.get('username', ''),
                'password': event.get('password', ''),
                'src_ip': event.get('src_ip', ''),
                'timestamp': event.get('timestamp', '')
            })
            self.attack_ips.add(event.get('src_ip', ''))
            
        elif event_id == 'cowrie.login.success':
            self.credentials.append({
                'username': event.get('username', ''),
                'password': event.get('password', ''),
                'src_ip': event.get('src_ip', ''),
                'timestamp': event.get('timestamp', ''),
                'success': True
            })
            self.attack_ips.add(event.get('src_ip', ''))
        
        # Commands executed
        elif event_id == 'cowrie.command.input':
            self.commands.append(event.get('input', ''))
            
        # Malware downloads
        elif event_id == 'cowrie.session.file_download':
            self.downloads.append({
                'url': event.get('url', ''),
                'shasum': event.get('shasum', ''),
                'outfile': event.get('outfile', ''),
                'src_ip': event.get('src_ip', ''),
                'timestamp': event.get('timestamp', '')
            })
            
        # Session tracking
        elif event_id == 'cowrie.session.connect':
            session_id = event.get('session', '')
            self.sessions[session_id] = {
                'src_ip': event.get('src_ip', ''),
                'start_time': event.get('timestamp', ''),
                'protocol': event.get('protocol', '')
            }
    
    def _print_statistics(self):
        """Print overall statistics"""
        successful_logins = sum(1 for c in self.credentials if c.get('success', False))
        
        print("=" * 60)
        print("HONEYPOT ANALYSIS SUMMARY")
        print("=" * 60)
        print(f"Total login attempts:     {len(self.credentials)}")
        print(f"Successful logins:        {successful_logins}")
        print(f"Unique credentials:       {len(set((c['username'], c['password']) for c in self.credentials))}")
        print(f"Commands executed:        {len(self.commands)}")
        print(f"Malware downloads:        {len(self.downloads)}")
        print(f"Unique attack IPs:        {len(self.attack_ips)}")
        print(f"Active sessions:          {len(self.sessions)}")
        print()
    
    def _print_top_credentials(self):
        """Print most common credentials"""
        print("=" * 60)
        print("TOP 20 CREDENTIALS ATTEMPTED")
        print("=" * 60)
        
        cred_counter = Counter((c['username'], c['password']) for c in self.credentials)
        
        print(f"{'Rank':<6} {'Username':<20} {'Password':<20} {'Count':<8}")
        print("-" * 60)
        
        for rank, ((user, passwd), count) in enumerate(cred_counter.most_common(20), 1):
            print(f"{rank:<6} {user:<20} {passwd:<20} {count:<8}")
        print()
    
    def _print_top_commands(self):
        """Print most common commands"""
        print("=" * 60)
        print("TOP 20 COMMANDS EXECUTED")
        print("=" * 60)
        
        cmd_counter = Counter(self.commands)
        
        print(f"{'Rank':<6} {'Command':<45} {'Count':<8}")
        print("-" * 60)
        
        for rank, (cmd, count) in enumerate(cmd_counter.most_common(20), 1):
            cmd_display = cmd[:45] if len(cmd) <= 45 else cmd[:42] + "..."
            print(f"{rank:<6} {cmd_display:<45} {count:<8}")
        print()
    
    def _print_malware_downloads(self):
        """Print malware download attempts"""
        if not self.downloads:
            return
            
        print("=" * 60)
        print("MALWARE DOWNLOADS")
        print("=" * 60)
        
        for idx, dl in enumerate(self.downloads, 1):
            print(f"\n[{idx}] SHA256: {dl['shasum']}")
            print(f"    URL:       {dl['url']}")
            print(f"    Source IP: {dl['src_ip']}")
            print(f"    File:      {dl['outfile']}")
            print(f"    Time:      {dl['timestamp']}")
        print()
    
    def _print_attack_patterns(self):
        """Identify and print attack patterns"""
        print("=" * 60)
        print("ATTACK PATTERN ANALYSIS")
        print("=" * 60)
        
        # Analyze commands for patterns
        patterns = {
            'wget/curl downloads': sum(1 for c in self.commands if any(x in c for x in ['wget', 'curl'])),
            'Port scanning': sum(1 for c in self.commands if 'nmap' in c or 'masscan' in c),
            'Shell downloads': sum(1 for c in self.commands if '.sh' in c),
            'Binary downloads': sum(1 for c in self.commands if any(x in c for x in ['.arm', '.mips', '.x86'])),
            'Privilege escalation': sum(1 for c in self.commands if 'sudo' in c or 'su -' in c),
            'Process killing': sum(1 for c in self.commands if 'kill' in c or 'pkill' in c),
            'Network recon': sum(1 for c in self.commands if any(x in c for x in ['ifconfig', 'ip addr', 'netstat'])),
            'Botnet behavior': sum(1 for c in self.commands if any(x in c for x in ['tftp', 'nc ', 'busybox']))
        }
        
        for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                print(f"  {pattern:<25} {count:>5} occurrences")
        print()
    
    def _generate_threat_intelligence(self):
        """Generate threat intelligence report"""
        print("=" * 60)
        print("THREAT INTELLIGENCE")
        print("=" * 60)
        
        # Extract IoCs
        print("\n[+] Indicators of Compromise (IoCs):")
        
        # Malicious IPs
        if self.attack_ips:
            print(f"\n  Malicious IPs ({len(self.attack_ips)}):")
            for ip in sorted(self.attack_ips)[:10]:
                ip_creds = sum(1 for c in self.credentials if c['src_ip'] == ip)
                print(f"    {ip:<16} ({ip_creds} attempts)")
            if len(self.attack_ips) > 10:
                print(f"    ... and {len(self.attack_ips) - 10} more")
        
        # Malware URLs
        if self.downloads:
            print(f"\n  Malware URLs ({len(self.downloads)}):")
            unique_urls = set(d['url'] for d in self.downloads)
            for url in sorted(unique_urls):
                print(f"    {url}")
        
        # Suspicious commands
        suspicious_cmds = [
            c for c in set(self.commands)
            if any(x in c for x in ['wget', 'curl', 'tftp', 'nc ', '/dev/tcp'])
        ]
        
        if suspicious_cmds:
            print(f"\n  Suspicious Commands ({len(suspicious_cmds)}):")
            for cmd in suspicious_cmds[:10]:
                print(f"    {cmd}")
            if len(suspicious_cmds) > 10:
                print(f"    ... and {len(suspicious_cmds) - 10} more")
        
        # Common TTPs (Tactics, Techniques, Procedures)
        print("\n[+] Common TTPs:")
        
        ttps = []
        
        if any('wget' in c or 'curl' in c for c in self.commands):
            ttps.append("  - Remote file download (wget/curl)")
        
        if any('.sh' in c for c in self.commands):
            ttps.append("  - Shell script execution")
        
        if any('chmod +x' in c for c in self.commands):
            ttps.append("  - Binary permission modification")
        
        if any('busybox' in c for c in self.commands):
            ttps.append("  - BusyBox-based botnet (likely Mirai variant)")
        
        if any('/dev/watchdog' in c for c in self.commands):
            ttps.append("  - Watchdog manipulation (persistence)")
        
        if any('kill' in c or 'pkill' in c for c in self.commands):
            ttps.append("  - Process termination (competitor removal)")
        
        for ttp in ttps:
            print(ttp)
        
        print()
        print("[+] Recommendations:")
        print("  - Block identified malicious IPs at firewall")
        print("  - Analyze downloaded malware samples")
        print("  - Update IDS signatures with observed patterns")
        print("  - Strengthen credential policies")
        print("  - Implement rate limiting on authentication")
        print()

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 analyze_honeypot_logs.py <cowrie.json>")
        sys.exit(1)
    
    logfile = sys.argv[1]
    
    try:
        analyzer = HoneypotAnalyzer(logfile)
        analyzer.analyze()
    except FileNotFoundError:
        print(f"Error: Log file not found: {logfile}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
