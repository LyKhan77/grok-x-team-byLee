#!/usr/bin/env python3
"""
CooperAgent — Pi Agent (Lightweight Inline CLI Coding Agent)
Ecosystem: CooperxHarness
Connects to CooperAgent Gateway (Port 8987)
"""
import sys
import os
import json
import urllib.request
import urllib.error

CONFIG_PATH = os.path.expanduser("~/.pi/config.json")

def load_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "base_url": "http://192.168.2.143:8987/v1",
        "api_key": "dev-user",
        "model": "qwen35",
        "temperature": 0.7,
        "context_window": 262144
    }

def print_banner(cfg):
    print("\033[36m=================================================================\033[0m")
    print("\033[32m  [+] CooperAgent Pi CLI — Lightweight Inline Coding Agent       \033[0m")
    print(f"\033[33m  Endpoint: {cfg.get('base_url')} | Model: {cfg.get('model')}\033[0m")
    print("\033[36m=================================================================\033[0m")
    print("Ketik prompt coding Anda, atau ketik '/exit' untuk keluar, '/clear' untuk reset.\n")

def stream_chat(messages, cfg):
    url = f"{cfg.get('base_url').rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {cfg.get('api_key', 'dev-user')}"
    }
    payload = {
        "model": cfg.get("model", "qwen35"),
        "messages": messages,
        "temperature": cfg.get("temperature", 0.7),
        "stream": True
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            full_content = ""
            for raw_line in response:
                line = raw_line.decode("utf-8").strip()
                if line.startswith("data: ") and line != "data: [DONE]":
                    try:
                        chunk = json.loads(line[6:])
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        reasoning = delta.get("reasoning_content", "")
                        if reasoning:
                            sys.stdout.write(f"\033[90m{reasoning}\033[0m")
                            sys.stdout.flush()
                        if content:
                            sys.stdout.write(content)
                            sys.stdout.flush()
                            full_content += content
                    except Exception:
                        pass
            print()
            return full_content
    except Exception as e:
        print(f"\n\033[31m[!] Error communicating with Gateway: {e}\033[0m")
        return None

def main():
    cfg = load_config()
    print_banner(cfg)

    messages = [
        {
            "role": "system",
            "content": (
                "You are CooperAgent Pi, an autonomous, highly capable terminal coding agent. "
                "You provide precise, clean, idiomatic code solutions following CooperxMemory standards."
            )
        }
    ]

    while True:
        try:
            user_input = input("\033[32mCooperPi > \033[0m").strip()
            if not user_input:
                continue
            if user_input.lower() in ["/exit", "exit", "quit", ":q"]:
                print("Sampai jumpa!")
                break
            if user_input.lower() in ["/clear", "clear"]:
                messages = [messages[0]]
                print("\033[33m[v] Sesi dibersihkan (Context 0 Token).\033[0m\n")
                continue

            messages.append({"role": "user", "content": user_input})
            print("\033[36mPi Agent Thinking & Responding...\033[0m")
            assistant_reply = stream_chat(messages, cfg)
            if assistant_reply:
                messages.append({"role": "assistant", "content": assistant_reply})
            print()
        except (KeyboardInterrupt, EOFError):
            print("\nSesi dihentikan.")
            break

if __name__ == "__main__":
    main()
