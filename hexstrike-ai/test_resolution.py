import os
import sys

# Add current dir to path for imports
sys.path.append(os.getcwd())

from hexstrike_server import resolve_tool_executable

def test():
    tools = ["sqlmap", "dirsearch", "arjun", "katana", "nuclei", "ffuf"]
    print("HEXSTRIKE RESOLUTION TEST")
    print("-" * 50)
    for t in tools:
        path = resolve_tool_executable(t)
        status = f"RESOLVED: {path}" if path else "FAILED"
        print(f"[*] {t:10} -> {status}")

if __name__ == "__main__":
    test()
