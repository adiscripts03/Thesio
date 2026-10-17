import os
import json
import logging
import re
import requests
from typing import Dict, Any, Optional

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):  # type: ignore
        pass

try:
    from groq import Groq
except ImportError:
    Groq = None  # type: ignore
from pydantic import BaseModel

# Automatically load environment variables from current working directory and repo root
load_dotenv()
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(root_env):
    load_dotenv(root_env)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model defaults
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "openai/gpt-oss-20b")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

_groq_client: Optional[Any] = None

def get_groq_client() -> Optional[Any]:
    """Lazily initializes and returns the Groq client, ensuring fresh environment variables."""
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    if Groq is None:
        return None
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        _groq_client = Groq(api_key=api_key)
        return _groq_client
    return None

def call_llm(prompt: str, system_prompt: str = "", require_json: bool = False, json_schema: Optional[type[BaseModel]] = None) -> str:
    """
    Calls Groq default model first. If rate-limited or JSON validation fails, retries with fallback model and Gemini.
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    client = get_groq_client()

    try:
        if not client:
            raise ValueError("GROQ_API_KEY is not set or Groq client is uninitialized.")
        
        logger.info(f"Calling Groq ({GROQ_MODEL})...")
        kwargs: Dict[str, Any] = {
            "messages": messages,
            "model": GROQ_MODEL,
        }
        if require_json:
            kwargs["response_format"] = {"type": "json_object"}
            
        completion = client.chat.completions.create(**kwargs)
        return completion.choices[0].message.content or ""
        
    except Exception as e:
        logger.warning(f"Groq primary call failed ({e}). Retrying with fallback ({GROQ_FALLBACK_MODEL})...")
        if client:
            try:
                kwargs = {
                    "messages": messages,
                    "model": GROQ_FALLBACK_MODEL,
                }
                if require_json:
                    # Do not enforce strict response_format on retry if JSON validation failed
                    if "json_validate_failed" not in str(e):
                        kwargs["response_format"] = {"type": "json_object"}
                completion = client.chat.completions.create(**kwargs)
                return completion.choices[0].message.content or ""
            except Exception as e2:
                logger.warning(f"Groq fallback failed: {e2}. Falling back to Gemini ({GEMINI_MODEL})...")
        
        # Fallback to Gemini if Groq is unavailable or failed
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            raise ValueError(f"Groq call failed ({e}) and GEMINI_API_KEY is not configured for fallback.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={gemini_api_key}"
        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        if system_prompt:
            payload["system_instruction"] = {"parts": [{"text": system_prompt}]}
        if require_json:
            payload["generationConfig"] = {"responseMimeType": "application/json"}

        g_res = requests.post(url, json=payload, timeout=60)
        if not g_res.ok:
            raise ValueError(f"Gemini API error ({g_res.status_code}): {g_res.text}")
        
        g_json = g_res.json()
        return g_json["candidates"][0]["content"]["parts"][0]["text"]

def extract_json(raw: str) -> dict:
    """Safely extracts and parses JSON from an LLM response even if fenced in markdown or with LaTeX escapes."""
    text = (raw or "").strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    
    start_indices = [i for i in [text.find("{"), text.find("[")] if i != -1]
    if start_indices:
        start = min(start_indices)
        end = max(text.rfind("}"), text.rfind("]"))
        if start != -1 and end != -1:
            text = text[start:end+1]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            # Fix unescaped backslashes commonly emitted in LaTeX equations
            fixed = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', text)
            # Remove trailing commas before closing braces
            fixed = re.sub(r',\s*([}\]])', r'\1', fixed)
            return json.loads(fixed)
        except Exception:
            raise ValueError(f"Failed to parse JSON from LLM response: {raw[:150]}")
