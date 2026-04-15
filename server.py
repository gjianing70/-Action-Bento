"""
Video2Action - Action Bento
Python backend: static files + REST API + LLM proxy
Supports: YouTube videos, Bilibili, articles, blogs, any webpage
"""

import json
import os
import re
import ssl
import time
import uuid
import urllib.request
import urllib.error
from html import unescape
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass

DATA_FILE = os.path.join(os.path.dirname(__file__), "actions.json")
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")
PORT = 8080

OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"

MODEL_ALIASES = {
    "deepseek-v3": "deepseek-chat",
    "deepseek_v3": "deepseek-chat",
    "DeepSeek-V3": "deepseek-chat",
}

MILESTONE_PROMPT = """\
You are Action Bento's knowledge breakdown expert.

I will provide information about some content (could be a video, article, blog, or webpage).
Break it down into 5-8 specific learning milestones.

Output STRICTLY as a JSON array (no markdown wrapping):
[
  {{
    "title": "A very specific skill or knowledge point",
    "action": "One short actionable tip (under 20 chars)",
    "position": "Location marker (MM:SS for video, paragraph/section name for article)",
    "category": "core OR demo OR biz"
  }}
]

Rules:
1. title must be very specific, e.g. "Master Agent-API call logic", NOT "learn AI"
2. action must be concrete, e.g. "Run curl to test API return value"
3. position: use MM:SS for video; use "Para 1" / "Section: xxx" for articles
4. category must be one of: core, demo, biz
   - core = core concept/principle
   - demo = case study/technique/example
   - biz = monetization/business value
5. Different content must produce completely different milestones
6. If content is unclear, make the best reasonable inference from title/description
7. For articles, focus on extracting core arguments, methodology, cases, actionable points
8. Respond in the SAME LANGUAGE as the content (Chinese content -> Chinese milestones)

Content:
{content}"""


def load_json(path, default=None):
    if default is None:
        default = []
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_actions():
    return load_json(DATA_FILE, [])


def save_actions(actions):
    save_json(DATA_FILE, actions)


def load_config():
    return load_json(CONFIG_FILE, {})


def save_config(cfg):
    save_json(CONFIG_FILE, cfg)


def resolve_endpoint(raw_endpoint):
    url = raw_endpoint.rstrip("/")
    if url.endswith("/chat/completions"):
        return url
    if url.endswith("/v1"):
        return url + "/chat/completions"
    if "/v1" in url and not url.endswith("/chat/completions"):
        return url + "/chat/completions"
    return url + "/v1/chat/completions"


def normalize_model(model):
    return MODEL_ALIASES.get(model, MODEL_ALIASES.get(model.lower(), model))


# ---- URL type detection ----

VIDEO_HOSTS = (
    "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
    "bilibili.com", "www.bilibili.com", "b23.tv",
    "vimeo.com", "dailymotion.com", "ted.com",
    "douyin.com", "v.douyin.com",
    "tiktok.com", "www.tiktok.com",
)


def is_video_url(url):
    host = urlparse(url).hostname or ""
    return any(host == h or host.endswith("." + h) for h in VIDEO_HOSTS)


# ---- YouTube metadata extraction ----

def extract_youtube_id(url):
    parsed = urlparse(url)
    if parsed.hostname in ("youtu.be",):
        return parsed.path.lstrip("/").split("/")[0]
    if parsed.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        if parsed.path.startswith(("/embed/", "/v/", "/shorts/")):
            return parsed.path.split("/")[2] if len(parsed.path.split("/")) > 2 else None
    return None


def fetch_video_metadata(url):
    ssl_ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    })
    try:
        with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
            html = resp.read().decode("utf-8", errors="replace")[:200_000]

        title = ""
        desc = ""

        og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', html)
        if og_title:
            title = unescape(og_title.group(1))
        else:
            t_tag = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
            if t_tag:
                title = unescape(t_tag.group(1))

        og_desc = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)', html)
        if og_desc:
            desc = unescape(og_desc.group(1))
        else:
            meta_desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', html)
            if meta_desc:
                desc = unescape(meta_desc.group(1))

        transcript = ""
        captions_match = re.search(r'"captions":\s*(\{.*?"captionTracks".*?\})', html)
        if not captions_match:
            script_blocks = re.findall(r'"text":"([^"]{5,200})"', html)
            if script_blocks:
                transcript = " ".join(script_blocks[:80])

        print(f"  [VIDEO] title={title[:60]}")
        if desc:
            print(f"  [VIDEO] desc={desc[:80]}")
        if transcript:
            print(f"  [VIDEO] transcript={transcript[:80]}...")

        return {
            "title": title[:200],
            "description": desc[:1000],
            "transcript": transcript[:3000],
        }
    except Exception as e:
        print(f"  [WARN] Video metadata fetch failed: {e}")
        return {"title": "", "description": "", "transcript": ""}


# ---- Webpage text extraction ----

def fetch_webpage_text(url):
    ssl_ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml",
    })
    try:
        with urllib.request.urlopen(req, timeout=20, context=ssl_ctx) as resp:
            html = resp.read().decode("utf-8", errors="replace")[:500_000]

        title = ""
        og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', html)
        if og_title:
            title = unescape(og_title.group(1))
        else:
            t_tag = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
            if t_tag:
                title = unescape(t_tag.group(1))

        desc = ""
        og_desc = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)', html)
        if og_desc:
            desc = unescape(og_desc.group(1))
        else:
            meta_desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', html)
            if meta_desc:
                desc = unescape(meta_desc.group(1))

        body_text = _extract_body_text(html)

        print(f"  [PAGE] title={title[:60]}")
        print(f"  [PAGE] body length={len(body_text)} chars")

        return {
            "title": title[:200],
            "description": desc[:500],
            "body": body_text[:6000],
        }
    except Exception as e:
        print(f"  [WARN] Webpage fetch failed: {e}")
        return {"title": "", "description": "", "body": ""}


def _extract_body_text(html):
    for tag in ("script", "style", "nav", "footer", "header", "noscript", "svg", "iframe"):
        html = re.sub(rf'<{tag}[\s>].*?</{tag}>', ' ', html, flags=re.DOTALL | re.IGNORECASE)

    html = re.sub(r'<br\s*/?\s*>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'</(?:p|div|h[1-6]|li|tr|blockquote|article|section)>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<[^>]+>', ' ', html)
    html = unescape(html)

    lines = []
    for line in html.split('\n'):
        line = re.sub(r'\s+', ' ', line).strip()
        if len(line) > 10:
            lines.append(line)

    return '\n'.join(lines)


def build_content_context(url):
    if is_video_url(url):
        content_type = "video"
        meta = fetch_video_metadata(url)
        parts = ["[Type: Video]", f"URL: {url}"]
        if meta["title"]:
            parts.append(f"Title: {meta['title']}")
        if meta["description"]:
            parts.append(f"Description: {meta['description']}")
        if meta["transcript"]:
            parts.append(f"Transcript snippet: {meta['transcript'][:2000]}")
    else:
        content_type = "article"
        meta = fetch_webpage_text(url)
        parts = ["[Type: Article/Webpage]", f"URL: {url}"]
        if meta["title"]:
            parts.append(f"Title: {meta['title']}")
        if meta["description"]:
            parts.append(f"Summary: {meta['description']}")
        if meta["body"]:
            parts.append(f"Body:\n{meta['body'][:5000]}")

    print(f"  [CTX] type={content_type}")
    return "\n".join(parts), content_type


# ---- LLM ----

def call_llm_raw(api_key, endpoint, model, messages, stream=False):
    final_url = resolve_endpoint(endpoint)
    final_model = normalize_model(model)

    payload = {"model": final_model, "messages": messages, "stream": stream}
    body = json.dumps(payload).encode("utf-8")

    print(f"  [LLM] request -> {final_url}")
    print(f"  [LLM] model={final_model}, msgs={len(messages)}")

    req = urllib.request.Request(final_url, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }, method="POST")

    ssl_ctx = ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(req, timeout=90, context=ssl_ctx) as resp:
            raw = resp.read().decode("utf-8")
            print(f"  [LLM] OK status={resp.status}, len={len(raw)}")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"  [LLM] HTTP {e.code}: {err_body[:500]}")
        raise
    except Exception as e:
        print(f"  [LLM] error: {e}")
        raise


def call_llm(api_key, endpoint, model, prompt):
    messages = [{"role": "user", "content": prompt}]
    result = call_llm_raw(api_key, endpoint, model, messages)

    content = result["choices"][0]["message"]["content"].strip()

    if content.startswith("```"):
        lines = content.split("\n")
        start = 1
        end = len(lines)
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip().startswith("```"):
                end = i
                break
        content = "\n".join(lines[start:end]).strip()

    bracket = content.find("[")
    if bracket > 0:
        content = content[bracket:]
    last_bracket = content.rfind("]")
    if last_bracket >= 0 and last_bracket < len(content) - 1:
        content = content[:last_bracket + 1]

    return json.loads(content)


CAT_MAP = {
    "core": "core", "demo": "demo", "biz": "biz",
    "Core Concept": "core", "Case Study": "demo", "Monetization": "biz",
}


# ---- HTTP Handler ----

class BentoHandler(SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/actions":
            self._json_response(load_actions())
        elif parsed.path == "/api/config":
            cfg = load_config()
            safe = {
                "provider": cfg.get("provider", "openai"),
                "endpoint": cfg.get("endpoint", ""),
                "model": cfg.get("model", "gpt-4o-mini"),
                "hasKey": bool(cfg.get("apiKey")),
            }
            self._json_response(safe)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/config":
            body = self._read_body()
            cfg = load_config()
            for key in ("provider", "endpoint", "model"):
                if key in body:
                    cfg[key] = body[key]
            if "apiKey" in body and body["apiKey"]:
                cfg["apiKey"] = body["apiKey"]
            save_config(cfg)
            self._json_response({"ok": True})

        elif parsed.path == "/api/analyze":
            self._handle_analyze()

        elif parsed.path == "/api/toggle":
            body = self._read_body()
            action_id = body.get("id")
            actions = load_actions()
            for act in actions:
                if act["id"] == action_id:
                    act["completed"] = not act["completed"]
                    break
            save_actions(actions)
            self._json_response({"ok": True})

        elif parsed.path == "/api/test-connection":
            self._handle_test_connection()

        else:
            self._json_response({"error": "not found"}, status=404)

    def _handle_analyze(self):
        body = self._read_body()
        url = body.get("url", "").strip()
        if not url:
            self._json_response({"error": "missing url"}, status=400)
            return

        cfg = load_config()
        api_key = cfg.get("apiKey", "")
        if not api_key:
            self._json_response({"error": "no_api_key"}, status=400)
            return

        provider = cfg.get("provider", "openai")
        if provider == "openai":
            endpoint = OPENAI_ENDPOINT
        else:
            endpoint = cfg.get("endpoint", "").strip()
            if not endpoint:
                self._json_response({"error": "no_endpoint"}, status=400)
                return

        model = cfg.get("model", "gpt-4o-mini")

        print(f"\n  [ANALYZE] url={url[:80]}")

        try:
            content_context, content_type = build_content_context(url)
        except Exception as e:
            print(f"  [ANALYZE] content fetch error: {e}")
            self._json_response({"error": "fetch_error", "detail": str(e)[:300]}, status=502)
            return

        prompt = MILESTONE_PROMPT.replace("{content}", content_context)

        print(f"  [ANALYZE] endpoint={endpoint} -> {resolve_endpoint(endpoint)}")
        print(f"  [ANALYZE] model={model} -> {normalize_model(model)}")
        print(f"  [ANALYZE] prompt length={len(prompt)} chars")

        try:
            result = call_llm(api_key, endpoint, model, prompt)
        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
            print(f"  [ANALYZE] FAILED HTTP {e.code}: {err_body[:200]}")
            self._json_response({"error": "llm_error", "detail": err_body[:300]}, status=502)
            return
        except json.JSONDecodeError as e:
            print(f"  [ANALYZE] JSON parse error: {e}")
            self._json_response({"error": "llm_parse_error", "detail": f"LLM returned invalid JSON: {e}"}, status=502)
            return
        except Exception as e:
            print(f"  [ANALYZE] FAILED: {e}")
            self._json_response({"error": "llm_error", "detail": str(e)[:300]}, status=502)
            return

        if isinstance(result, dict) and "milestones" in result:
            milestones = result["milestones"]
        elif isinstance(result, list):
            milestones = result
        else:
            milestones = [result]

        now = int(time.time() * 1000)
        group_id = f"grp-{uuid.uuid4().hex[:8]}"
        actions = load_actions()
        new_items = []

        for i, m in enumerate(milestones[:8]):
            cat_raw = m.get("category", "core")
            cat_key = CAT_MAP.get(cat_raw, CAT_MAP.get(cat_raw.lower() if isinstance(cat_raw, str) else "", "core"))
            pos = m.get("position", "") or m.get("timestamp", "")
            if not pos:
                pos = f"{i*5:02d}:00" if content_type == "video" else f"Part {i+1}"
            item = {
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "groupId": group_id,
                "title": m.get("title", f"Milestone {i+1}"),
                "action": m.get("action", ""),
                "timestamp": pos,
                "category": cat_key,
                "categoryLabel": cat_raw,
                "source": url[:120],
                "contentType": content_type,
                "completed": False,
                "createdAt": now,
                "order": i,
            }
            new_items.append(item)
            actions.append(item)

        save_actions(actions)
        print(f"  [ANALYZE] OK: {len(new_items)} milestones ({content_type}) group={group_id}")
        self._json_response({"milestones": new_items, "groupId": group_id, "contentType": content_type}, status=201)

    def _handle_test_connection(self):
        cfg = load_config()
        api_key = cfg.get("apiKey", "")
        if not api_key:
            self._json_response({"ok": False, "error": "no_api_key"})
            return

        provider = cfg.get("provider", "openai")
        endpoint = OPENAI_ENDPOINT if provider == "openai" else cfg.get("endpoint", "")
        model = cfg.get("model", "gpt-4o-mini")

        resolved = resolve_endpoint(endpoint)
        resolved_model = normalize_model(model)
        print(f"\n  [TEST] {resolved} model={resolved_model}")

        try:
            messages = [{"role": "user", "content": "hi"}]
            result = call_llm_raw(api_key, endpoint, model, messages, stream=False)
            reply = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"  [TEST] OK: {reply[:60]}")
            self._json_response({"ok": True, "reply": reply[:100]})
        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
            print(f"  [TEST] FAILED HTTP {e.code}: {err_body[:200]}")
            self._json_response({
                "ok": False, "error": f"HTTP {e.code}",
                "detail": err_body[:300],
                "resolved_url": resolved, "resolved_model": resolved_model,
            })
        except Exception as e:
            print(f"  [TEST] FAILED: {e}")
            self._json_response({
                "ok": False, "error": str(e)[:300],
                "resolved_url": resolved, "resolved_model": resolved_model,
            })

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        return json.loads(raw) if raw else {}

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_response(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        print(f"  [HTTP] {args[0]}")


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    if not os.path.exists(DATA_FILE):
        save_actions([])
    server = HTTPServer(("", PORT), BentoHandler)
    print(f"\n  Action Bento server running at http://localhost:{PORT}")
    print(f"  Data: {DATA_FILE}")
    print(f"  Config: {CONFIG_FILE}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
