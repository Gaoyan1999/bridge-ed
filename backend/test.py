import os
import sys

import requests
from backend.config import load_dotenv


def read_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if not value:
        raise RuntimeError(f"{name} is not set")
    return value


def main() -> int:
    load_dotenv()
    api_url = read_env("CURRICULLM_API_URL", "https://api.curricullm.com/v1/chat/completions")
    api_key = read_env("CURRICULLM_API_KEY")
    model = os.getenv("CURRICULLM_MODEL", "CurricuLLM-AU")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Create me a lesson plan for stage 5 maths, focus on quadratic equations",
            }
        ],
    }

    try:
        resp = requests.post(
            api_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
            timeout=60,
        )
        print(f"Status: {resp.status_code}")
        print(resp.text)
        resp.raise_for_status()
        return 0
    except requests.HTTPError as exc:
        print(f"HTTPError: {exc.response.status_code}", file=sys.stderr)
        print(exc.response.text, file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
