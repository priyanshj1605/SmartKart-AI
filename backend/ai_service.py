import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def get_ai_suggestion(prompt: str):
    if not OPENROUTER_API_KEY:
        return {
            "suggestion": "OpenRouter API key not configured. Add OPENROUTER_API_KEY to your environment to enable live AI suggestions."
        }

    payload = {
        "model": "openai/gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a helpful retail AI assistant."},
            {"role": "user", "content": prompt},
        ],
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        return {"suggestion": data["choices"][0]["message"]["content"].strip()}
    except Exception as exc:
        return {"suggestion": f"AI request failed: {exc}"}
