/*
 * YARA Rules for Mirai-based IoT Botnet Detection
 * 
 * Purpose: Educational and defensive use only
 * Author: Mirai 2026 Research Team
 * Date: 2026-02-25
 * 
 * Usage: yara -r detection_rules.yar /path/to/scan
 */

import "elf"
import "math"

rule Mirai_IoT_Botnet_Binary
{
    meta:
        description = "Detects Mirai-based IoT botnet binaries"
        author = "Security Research Team"
        date = "2026-02-25"
        severity = "critical"
        reference = "https://github.com/fxinfo24/Mirai-2026"
        
    strings:
        // Mirai table encryption patterns
        $table_key = { 0xDE 0xAD 0xBE 0xEF }
        $table_init = "table_init" ascii
        
        // Common Mirai strings (obfuscated in real malware)
        $scanner1 = "POST /cgi-bin/" ascii
        $scanner2 = "GET /admin" ascii
        $scanner3 = "/dev/watchdog" ascii
        $scanner4 = "/dev/misc/watchdog" ascii
        
        // Credential patterns
        $cred1 = "root:root" ascii
        $cred2 = "admin:admin" ascii
        $cred3 = "admin:password" ascii
        $cred4 = "default:default" ascii
        
        // Attack strings
        $attack1 = "udpflood" ascii nocase
        $attack2 = "synflood" ascii nocase
        $attack3 = "httpflood" ascii nocase
        $attack4 = "DNS amplification" ascii nocase
        
        // Process hiding
        $hide1 = "prctl" ascii
        $hide2 = "PR_SET_NAME" ascii
        $hide3 = "/proc/self/exe" ascii
        
        // Network patterns
        $net1 = { 00 00 00 01 }  // Version handshake
        $net2 = "PING" ascii
        $net3 = "PONG" ascii
        
    condition:
        // Must be ELF binary
        uint32(0) == 0x464c457f and
        
        // File size typical for IoT malware (50KB - 500KB)
        filesize > 50KB and filesize < 500KB and
        
        // Detection heuristics (any of these combinations)
        (
            // Strong indicator: table encryption + scanner
            ($table_key and 2 of ($scanner*)) or
            
            // Credentials + attacks
            (3 of ($cred*) and 2 of ($attack*)) or
            
            // Process hiding + network
            (2 of ($hide*) and 2 of ($net*)) or
            
            // Multiple scanner patterns
            (4 of ($scanner*, $cred*, $attack*))
        )
}

rule Mirai_Scanner_Module
{
    meta:
        description = "Detects Mirai scanner module"
        author = "Security Research Team"
        severity = "high"
        
    strings:
        // Telnet scanner patterns
        $telnet1 = { FF FB 01 FF FB 03 FF FC 01 }  // IAC sequences
        $telnet2 = { FF FA 1F }  // IAC SB NAWS
        
        // Scanner behavior
        $scan1 = "SYN_RECV" ascii
        $scan2 = "port 23" ascii
        $scan3 = "port 2323" ascii
        $scan4 = "port 8023" ascii
        
        // Brute force indicators
        $brute1 = "login:" ascii
        $brute2 = "Password:" ascii
        $brute3 = "incorrect" ascii nocase
        
        // IP scanning
        $ip1 = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}/
        
    condition:
        uint32(0) == 0x464c457f and
        (
            (2 of ($telnet*) and 2 of ($scan*)) or
            (3 of ($brute*) and $ip1) or
            (3 of ($scan*))
        )
}

rule Mirai_CNC_Client
{
    meta:
        description = "Detects C&C client component"
        author = "Security Research Team"
        severity = "critical"
        
    strings:
        // C&C communication
        $cnc1 = "PING" fullword
        $cnc2 = "PONG" fullword
        $cnc3 = { 00 00 00 01 }  // Handshake version
        $cnc4 = { AA BB }         // Heartbeat pattern
        
        // Command structures
        $cmd1 = "attack_" ascii
        $cmd2 = "killer_" ascii
        $cmd3 = "scanner_" ascii
        
        // Binary protocol
        $proto1 = { 00 00 ?? ?? }  // Length prefix
        $proto2 = { FF FF FF FF }  // Marker/separator
        
    condition:
        uint32(0) == 0x464c457f and
        (
            (3 of ($cnc*)) or
            (2 of ($cmd*) and 1 of ($proto*))
        )
}

rule AI_Generated_Credentials_File
{
    meta:
        description = "Detects AI-generated credential lists"
        author = "Security Research Team"
        severity = "medium"
        
    strings:
        // JSON structure
        $json1 = /"username":\s*"[^"]+"/
        $json2 = /"password":\s*"[^"]+"/
        $json3 = /"weight":\s*[\d.]+/
        $json4 = /"confidence":\s*0\.[0-9]+/
        
        // LLM indicators
        $llm1 = /"source":\s*"llm"/
        $llm2 = /"source":\s*"openai"/
        $llm3 = /"source":\s*"claude"/
        
        // Credential metadata
        $meta1 = /"device_type":/
        $meta2 = /"target_platform":/
        
    condition:
        // JSON file
        $json1 and $json2 and
        (
            // AI-generated
            ($json3 and $json4) or
            (1 of ($llm*)) or
            (1 of ($meta*))
        )
}

rule Mirai_Attack_Module
{
    meta:
        description = "Detects attack module"
        author = "Security Research Team"
        severity = "critical"
        
    strings:
        // UDP flood
        $udp1 = "sendto" ascii
        $udp2 = "SOCK_DGRAM" ascii
        $udp3 = "random" ascii
        
        // TCP SYN flood
        $syn1 = "IPPROTO_TCP" ascii
        $syn2 = "SYN" ascii
        $syn3 = "htons" ascii
        
        // HTTP flood
        $http1 = "GET /" ascii
        $http2 = "POST /" ascii
        $http3 = "Host:" ascii
        $http4 = "User-Agent:" ascii
        
        // Packet crafting
        $craft1 = "iphdr" ascii
        $craft2 = "tcphdr" ascii
        $craft3 = "udphdr" ascii
        
    condition:
        uint32(0) == 0x464c457f and
        (
            (2 of ($udp*) and $craft3) or
            (2 of ($syn*) and $craft2) or
            (3 of ($http*)) or
            (2 of ($craft*))
        )
}

rule Mirai_Process_Hiding
{
    meta:
        description = "Detects process hiding techniques"
        author = "Security Research Team"
        severity = "high"
        
    strings:
        // prctl usage
        $prctl1 = "prctl" ascii
        $prctl2 = "PR_SET_NAME" ascii
        $prctl3 = { 0F 00 00 00 }  // PR_SET_NAME value
        
        // Process names to imitate
        $imitate1 = "systemd" fullword
        $imitate2 = "kworker" fullword
        $imitate3 = "init" fullword
        $imitate4 = "[kthreadd]" ascii
        
        // Unlinking
        $unlink1 = "unlink" ascii
        $unlink2 = "/proc/self/exe" ascii
        $unlink3 = "readlink" ascii
        
    condition:
        uint32(0) == 0x464c457f and
        (
            ($prctl1 and $prctl2) or
            (2 of ($imitate*)) or
            ($unlink1 and $unlink2)
        )
}

rule Mirai_Watchdog_Manipulation
{
    meta:
        description = "Detects hardware watchdog manipulation"
        author = "Security Research Team"
        severity = "high"
        
    strings:
        // Watchdog device
        $wdt1 = "/dev/watchdog" ascii
        $wdt2 = "/dev/misc/watchdog" ascii
        
        // ioctl commands
        $ioctl1 = "ioctl" ascii
        $ioctl2 = "WDIOC_" ascii
        $ioctl3 = { 04 57 44 49 }  // WDIOS_DISABLECARD
        
        // Watchdog patterns
        $wdt_ops1 = "WDIOS_DISABLECARD" ascii
        $wdt_ops2 = "WDIOC_SETOPTIONS" ascii
        
    condition:
        uint32(0) == 0x464c457f and
        (
            (1 of ($wdt*) and 1 of ($ioctl*)) or
            (1 of ($wdt_ops*))
        )
}

rule Mirai_Multi_Architecture
{
    meta:
        description = "Detects cross-compiled malware for multiple architectures"
        author = "Security Research Team"
        severity = "medium"
        
    strings:
        // Architecture strings
        $arch1 = "arm" ascii
        $arch2 = "mips" ascii
        $arch3 = "x86" ascii
        $arch4 = "ppc" ascii
        $arch5 = "sh4" ascii
        $arch6 = "m68k" ascii
        
    condition:
        uint32(0) == 0x464c457f and
        3 of ($arch*)
}

rule Mirai_Network_Scan_Config
{
    meta:
        description = "Detects network scanning configuration"
        author = "Security Research Team"
        severity = "medium"
        
    strings:
        // IP ranges
        $range1 = /(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.0\.0\.0\/8/
        $range2 = /(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.0\.0\/16/
        
        // Port lists
        $ports1 = "23,2323,8023" ascii
        $ports2 = "80,8080,8888" ascii
        
        // Scan config
        $scan1 = "scan_rate" ascii
        $scan2 = "max_conn" ascii
        $scan3 = "timeout" ascii
        
    condition:
        (1 of ($range*) and 1 of ($ports*)) or
        (2 of ($scan*))
}

rule Mirai_Encrypted_Strings
{
    meta:
        description = "Detects encrypted string table (obfuscation)"
        author = "Security Research Team"
        severity = "low"
        
    condition:
        uint32(0) == 0x464c457f and
        // High entropy in .rodata section
        math.entropy(0, filesize) > 7.5 and
        // Multiple XOR patterns
        #{ 31 ?? ?? ?? ?? }  > 20  // XOR operations
}

/*
 * Usage Examples:
 * 
 * 1. Scan a directory:
 *    yara -r detection_rules.yar /suspicious/directory/
 * 
 * 2. Scan with specific rule:
 *    yara -r -s Mirai_IoT_Botnet_Binary detection_rules.yar /path/
 * 
 * 3. JSON output:
 *    yara --print-meta --print-strings -r detection_rules.yar /path/ > results.json
 * 
 * 4. Fast scan (skip large files):
 *    yara -r -f -m 1MB detection_rules.yar /path/
 */
