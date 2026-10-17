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

# Gemma 4 LLM Configuration - Hacktoberfest Hack Day x AWS SBG RTMSSU
USE_LOCAL_LLM = os.getenv("USE_LOCAL_LLM", "false").lower() == "true"
GEMMA_MODEL = os.getenv("LLM_MODEL") or os.getenv("GEMMA_MODEL") or "gemma4:12b"
GEMMA_FALLBACK_MODEL = os.getenv("LLM_FALLBACK_MODEL") or os.getenv("GEMMA_FALLBACK_MODEL") or "gemma4:12b"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

def is_ollama_online(url: str = "http://localhost:11434/api/tags") -> bool:
    """Checks if local Ollama daemon is actively reachable."""
    try:
        r = requests.get(url, timeout=0.8)
        return r.status_code == 200
    except Exception:
        return False

def get_llm_config():
    """
    Intelligently resolves local Gemma 4 vs hosted Groq/Gemini Cloud API:
    1. If USE_LOCAL_LLM is true or Ollama is online -> uses local gemma4:12b via Ollama.
    2. If Groq API key is set -> uses Groq high-speed cloud inference.
    3. Else falls back to Google Gemma / Gemini Cloud API.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    gemma_key = os.getenv("GEMMA_API_KEY") or os.getenv("GEMMA_4_API_KEY")
    base_url = os.getenv("LLM_BASE_URL")
    
    # Check if local Ollama is available
    local_active = USE_LOCAL_LLM or is_ollama_online()

    if not base_url:
        if local_active:
            base_url = "http://localhost:11434/v1/chat/completions"
        elif groq_key:
            base_url = "https://api.groq.com/openai/v1/chat/completions"
        else:
            base_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

    is_local = "localhost" in base_url or "127.0.0.1" in base_url
    is_groq = "groq.com" in base_url

    if is_local:
        token = "ollama"
        model = os.getenv("LLM_MODEL") or os.getenv("GEMMA_MODEL") or "gemma4:12b"
    elif is_groq:
        token = groq_key or ""
        model = os.getenv("GROQ_MODEL") or os.getenv("LLM_MODEL") or "llama-3.3-70b-versatile"
    else:
        token = gemma_key or gemini_key or ""
        model = os.getenv("LLM_MODEL") or os.getenv("GEMMA_MODEL") or "gemma-2-27b-it"

    return base_url, token, is_local, model

def _call_gemini_fallback(prompt: str, system_prompt: str, require_json: bool, api_key: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    payload: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    if system_prompt:
        payload["system_instruction"] = {"parts": [{"text": system_prompt}]}
    if require_json:
        payload["generationConfig"] = {"responseMimeType": "application/json"}

    g_res = requests.post(url, json=payload, timeout=60)
    if not g_res.ok:
        raise ValueError(f"Gemini API error ({g_res.status_code}): {g_res.text[:200]}")
    g_json = g_res.json()
    return g_json["candidates"][0]["content"]["parts"][0]["text"]

def call_llm(
    prompt: str, 
    system_prompt: str = "", 
    require_json: bool = False, 
    json_schema: Optional[type[BaseModel]] = None,
    model_override: Optional[str] = None
) -> str:
    """
    Calls Gemma 4 (Local or Cloud API) first.
    If rate-limited or fails, gracefully falls back to Gemini.
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    base_url, api_key, is_local, auto_model = get_llm_config()
    model = model_override or auto_model

    headers = {
        "Content-Type": "application/json",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload: Dict[str, Any] = {
        "messages": messages,
        "model": model,
        "max_tokens": 4096 if is_local else 2048,
    }
    if require_json:
        payload["response_format"] = {"type": "json_object"}

    logger.info(f"Calling Gemma 4 ({model}) at {base_url}...")
    try:
        res = requests.post(base_url, headers=headers, json=payload, timeout=90)
        
        # If response was not ok, check if response_format caused issue or if retry needed
        if not res.ok:
            logger.warning(f"Gemma 4 call returned HTTP {res.status_code}: {res.text[:200]}")
            if require_json and "response_format" in payload:
                logger.info("Retrying without response_format constraint...")
                payload_retry = dict(payload)
                del payload_retry["response_format"]
                res_retry = requests.post(base_url, headers=headers, json=payload_retry, timeout=90)
                if res_retry.ok:
                    data = res_retry.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "")

            # If cloud fallback to Gemini is available
            gemini_key = os.getenv("GEMINI_API_KEY") or (api_key if not is_local else "")
            if gemini_key and not is_local:
                logger.info("Falling back to Gemini...")
                return _call_gemini_fallback(prompt, system_prompt, require_json, gemini_key)

            res.raise_for_status()

        data = res.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not content:
            raise ValueError(f"Empty content returned from Gemma 4 API ({base_url})")
        return content

    except Exception as e:
        logger.warning(f"Gemma 4 primary call failed: {e}. Attempting fallback...")
        gemini_key = os.getenv("GEMINI_API_KEY") or (api_key if not is_local else "")
        if gemini_key and not is_local:
            try:
                logger.info("Retrying with Gemini fallback...")
                return _call_gemini_fallback(prompt, system_prompt, require_json, gemini_key)
            except Exception as e_gemini:
                logger.error(f"Gemini fallback failed: {e_gemini}")

        # Check if Groq fallback is configured and available (direct HTTP)
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                logger.info("Attempting Groq HTTP fallback...")
                groq_model = os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile"
                groq_payload: Dict[str, Any] = {
                    "model": groq_model,
                    "messages": messages,
                    "max_tokens": 4096,
                }
                if require_json:
                    groq_payload["response_format"] = {"type": "json_object"}
                groq_res = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {groq_key}"},
                    json=groq_payload,
                    timeout=60,
                )
                if groq_res.ok:
                    groq_data = groq_res.json()
                    return groq_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                logger.warning(f"Groq HTTP fallback error ({groq_res.status_code}): {groq_res.text[:150]}")
            except Exception as e_groq:
                logger.error(f"Groq fallback failed: {e_groq}")

        raise ValueError(f"LLM call failed across all providers: {e}")

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
