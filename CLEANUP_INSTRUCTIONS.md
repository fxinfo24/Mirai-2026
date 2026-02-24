# Repository Cleanup Instructions

## Issue

The repository currently contains legacy directories that should be removed:
- `Mirai-Source-Code-master/` (old nested repository structure)
- `dlr/` (legacy downloader code)
- `scripts/` (old build scripts)

These are already in `.gitignore` but are still tracked by git from previous commits.

## Solution

Run these commands in your terminal (from repository root):

```bash
# Navigate to repository root
cd /Volumes/ByteSmith/BuildLab/Mirai-Source-Code

# Remove legacy directories from git tracking
git rm -r --cached Mirai-Source-Code-master
git rm -r --cached dlr
git rm -r --cached scripts

# Remove .DS_Store files
git rm --cached .DS_Store
git rm --cached loader/.DS_Store
git rm --cached mirai/.DS_Store

# Commit the removal
git commit -m "chore: Remove legacy directories from repository

- Remove Mirai-Source-Code-master/ (old nested structure)
- Remove dlr/ (legacy downloader)
- Remove scripts/ (old build scripts)
- Remove .DS_Store files

Repository now contains only Mirai 2026 modernized code."

# Push to GitHub
git push origin main
```

## Verify

After pushing, check: https://github.com/fxinfo24/Mirai-2026

You should see only these directories:
- `ai/` - AI/ML services
- `config/` - Configuration files
- `docker/` - Docker containers
- `docs/` - Documentation
- `k8s/` - Kubernetes manifests
- `loader/` - Device loader (modernized)
- `mirai/` - Original reference code
- `observability/` - Monitoring
- `src/` - Modern C codebase
- `terraform/` - Infrastructure as Code
- `tests/` - Test suite
- `tutorials/` - Interactive tutorials

## Alternative: Start Fresh (Optional)

If you prefer a completely clean repository:

```bash
# Create new orphan branch with only modern code
cd /Volumes/ByteSmith/BuildLab/Mirai-Source-Code

# Remove legacy dirs locally first
rm -rf Mirai-Source-Code-master dlr scripts
find . -name ".DS_Store" -delete

# Create clean commit
git checkout --orphan clean
git add -A
git commit -m "feat: Mirai 2026 v2.0.0 - Clean modernized codebase"

# Replace main branch
git branch -D main
git branch -m main

# Force push
git push -f origin main
git push -f origin v2.0.0
```

---

**Current Status:** All modern code is on GitHub, just needs cleanup of legacy directories.
