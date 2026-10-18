import os

import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'openai/gpt-4o-mini')


def get_ai_suggestion(prompt: str, max_tokens: int = 180):
    if not OPENROUTER_API_KEY:
        return None

    payload = {
        'model': OPENROUTER_MODEL,
        'messages': [
            {'role': 'system', 'content': 'You are a helpful retail AI assistant.'},
            {'role': 'user', 'content': prompt},
        ],
        'max_tokens': max_tokens,
    }
    headers = {
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
        'Content-Type': 'application/json',
    }
    try:
        response = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=(5, 20))
        response.raise_for_status()
        data = response.json()
        suggestion = data['choices'][0]['message']['content']
        return suggestion.strip() if isinstance(suggestion, str) else None
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError):
        return None
