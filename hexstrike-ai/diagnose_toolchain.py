import subprocess
import os

def check_tool(tool_name, cmd_args=["--version"]):
    print(f"[*] Checking {tool_name}...", end=" ", flush=True)
    try:
        result = subprocess.run([tool_name] + cmd_args, capture_output=True, text=True, timeout=5)
        if result.returncode == 0 or result.stdout or result.stderr:
            print("OK")
            return True
        else:
            print(f"FAILED (Exit code {result.returncode})")
            return False
    except FileNotFoundError:
        print("NOT FOUND")
        return False
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

def diagnose():
    # Attempting common paths if not in PATH
    tools = {
        "nuclei": ["-version"],
        "sqlmap": ["--version"],
        "ffuf": ["-V"],
        "dalfox": ["version"],
        "katana": ["-version"],
        "arjun": ["--version"],
        "dirsearch": ["--version"],
        "feroxbuster": ["--version"],
        "nikto": ["-Version"]
    }
    
    print("HEXSTRIKE TOOLCHAIN DIAGNOSIS (NO-EMOJI MODE)")
    print("-" * 50)
    for tool, args in tools.items():
        check_tool(tool, args)

if __name__ == "__main__":
    diagnose()
