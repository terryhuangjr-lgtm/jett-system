import json, subprocess, os
result = subprocess.run(["python3", "/home/clawd/.hermes/scripts/maggiepm-query.py", "rent-status"], capture_output=True, text=True)
print(result.stdout)
