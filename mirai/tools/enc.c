#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <arpa/inet.h>

/* ── Research Enhancement: libsodium ChaCha20-Poly1305 option ───────────────
 * Original XOR encoding is preserved unchanged.
 * When compiled with -DUSE_SODIUM and linked against libsodium, the tool
 * also offers "chacha20" as a new data type argument that produces
 * authenticated encrypted output suitable for research C2 traffic.
 *
 * Compile with: gcc -DUSE_SODIUM -lsodium -o enc enc.c
 * Usage (new):  enc chacha20 <hex_key> <plaintext>
 * Usage (orig): enc string|ip|uint32|uint16|uint8|bool <data>   (unchanged)
 */
#ifdef USE_SODIUM
#include <sodium.h>
#endif


static uint32_t table_key = 0xdeadbeef;

void *x(void *, int);

int main(int argc, char **args)
{
    void *data;
    int len, i;

    if (argc != 3)
    {
        printf("Usage: %s <string | ip | uint32 | uint16 | uint8 | bool> <data>\n", args[0]);
        return 0;
    }

    if (strcmp(args[1], "string") == 0)
    {
        data = args[2];
        len = strlen(args[2]) + 1;
    }
    else if (strcmp(args[1], "ip") == 0)
    {
        data = calloc(1, sizeof (uint32_t));
        *((uint32_t *)data) = inet_addr(args[2]);
        len = sizeof (uint32_t);
    }
    else if (strcmp(args[1], "uint32") == 0)
    {
        data = calloc(1, sizeof (uint32_t));
        *((uint32_t *)data) = htonl((uint32_t)atoi(args[2]));
        len = sizeof (uint32_t);
    }
    else if (strcmp(args[1], "uint16") == 0)
    {
        data = calloc(1, sizeof (uint16_t));
        *((uint16_t *)data) = htons((uint16_t)atoi(args[2]));
        len = sizeof (uint16_t);
    }
    else if (strcmp(args[1], "uint8") == 0)
    {
        data = calloc(1, sizeof (uint8_t));
        *((uint8_t *)data) = atoi(args[2]);
        len = sizeof (uint8_t);
    }
    else if (strcmp(args[1], "bool") == 0)
    {
        data = calloc(1, sizeof (char));
        if (strcmp(args[2], "false") == 0)
            ((char *)data)[0] = 0;
        else if (strcmp(args[2], "true") == 0)
            ((char *)data)[0] = 1;
        else
        {
            printf("Unknown value `%s` for datatype bool!\n", args[2]);
            return -1;
        }
        len = sizeof (char);
    }
#ifdef USE_SODIUM
    else if (strcmp(args[1], "chacha20") == 0)
    {
        /* New: ChaCha20-Poly1305 AEAD encryption
         * Args: enc chacha20 <32-byte-hex-key> <plaintext>
         * Produces: nonce(24 bytes) + ciphertext + tag(16 bytes)
         * For research C2 traffic authentication
         */
        if (argc != 4) {
            printf("Usage: %s chacha20 <64-char-hex-key> <plaintext>\n", args[0]);
            return -1;
        }
        if (sodium_init() < 0) {
            printf("libsodium init failed\n");
            return -1;
        }
        const char *hex_key = args[2];
        if (strlen(hex_key) != 64) {
            printf("Key must be 64 hex chars (32 bytes)\n");
            return -1;
        }
        unsigned char key[crypto_aead_chacha20poly1305_ietf_KEYBYTES];
        if (sodium_hex2bin(key, sizeof(key), hex_key, 64, NULL, NULL, NULL) != 0) {
            printf("Invalid hex key\n");
            return -1;
        }
        const char *plaintext = args[3];
        size_t plen = strlen(plaintext);
        unsigned char nonce[crypto_aead_chacha20poly1305_ietf_NPUBBYTES];
        randombytes_buf(nonce, sizeof(nonce));

        size_t clen = plen + crypto_aead_chacha20poly1305_ietf_ABYTES;
        unsigned char *ciphertext = malloc(clen);
        unsigned long long actual_clen;
        crypto_aead_chacha20poly1305_ietf_encrypt(
            ciphertext, &actual_clen,
            (const unsigned char *)plaintext, plen,
            NULL, 0, NULL, nonce, key);

        printf("nonce: ");
        for (size_t i = 0; i < sizeof(nonce); i++) printf("\\x%02X", nonce[i]);
        printf("\nciphertext+tag: ");
        for (size_t i = 0; i < actual_clen; i++) printf("\\x%02X", ciphertext[i]);
        printf("\n");
        free(ciphertext);
        return 0;
    }
#endif /* USE_SODIUM */
    else
    {
        printf("Unknown data type `%s`!\n", args[1]);
        return -1;
    }

    // Yes we are leaking memory, but the program is so
    // short lived that it doesn't really matter...
    printf("XOR'ing %d bytes of data...\n", len);
    data = x(data, len);
    for (i = 0; i < len; i++)
        printf("\\x%02X", ((unsigned char *)data)[i]);
    printf("\n");
}

void *x(void *_buf, int len)
{
    unsigned char *buf = (char *)_buf, *out = malloc(len);
    int i;
    uint8_t k1 = table_key & 0xff,
            k2 = (table_key >> 8) & 0xff,
            k3 = (table_key >> 16) & 0xff,
            k4 = (table_key >> 24) & 0xff;

    for (i = 0; i < len; i++)
    {
        char tmp = buf[i] ^ k1;

        tmp ^= k2;
        tmp ^= k3;
        tmp ^= k4;

        out[i] = tmp;
    }

    return out;
}
