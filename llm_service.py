# llm_service.py
import os
import requests

API_KEY = os.getenv("GEMINI_API_KEY")
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

def query_llm(prompt, temperature, top_p, top_k, context=None):
    url = f"{BASE_URL}?key={API_KEY}"
    
    full_prompt = prompt
    if context:
        full_prompt = f"Context: {context}\n\nQuestion: {prompt}"
    
    payload = {
        "contents": [{
            "parts": [{"text": full_prompt}]
        }]
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]