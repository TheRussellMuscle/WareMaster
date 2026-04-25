"""One-shot YAML validator for docs/data/. Run from repo root."""
import os
import sys
import yaml

DATA_DIR = os.path.join("docs", "data")

ok = 0
fail = 0
files = []
for root, _, names in os.walk(DATA_DIR):
    for n in names:
        if n.endswith(".yaml") or n.endswith(".yml"):
            files.append(os.path.join(root, n))

for path in sorted(files):
    try:
        with open(path, "r", encoding="utf-8") as f:
            yaml.safe_load(f)
        print(f"OK   {path}")
        ok += 1
    except Exception as e:
        print(f"FAIL {path} :: {e}")
        fail += 1

print("---")
print(f"Total: {len(files)}, OK: {ok}, FAIL: {fail}")
sys.exit(0 if fail == 0 else 1)
