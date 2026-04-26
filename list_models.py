import os
import google.generativeai as genai

# Manually read .env
api_key = None
try:
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('GEMINI_API_KEY='):
                api_key = line.strip().split('=', 1)[1].strip('"')
                break
except Exception as e:
    print(f"Error reading .env: {e}")

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
else:
    genai.configure(api_key=api_key)
    print("Listing available models:")
    try:
        for m in genai.list_models():
            print(f"Name: {m.name}")
            print(f"Description: {m.description}")
            print(f"Supported generation methods: {m.supported_generation_methods}")
            print("-" * 20)
    except Exception as e:
        print(f"Error listing models: {e}")
