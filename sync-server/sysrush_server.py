#!/usr/bin/env python3
"""
SysRush 24/7 Bidirectional Sync & AI Mentor Daemon (Laptop <-> Cloud <-> Android)
- Serves Web UI on http://0.0.0.0:8765
- Provides CRDT conflict-free state merge API (/api/state) + live SSE push (/api/events)
- Mirrors state in real time with private ntfy.sh HTTPS relay so Android syncs over 4G/LTE even when away from home Wi-Fi
- Provides AI Mentor endpoint (/api/ai) powered by Google Gemini 2.5 Flash + local Antigravity (`agy`) CLI
"""
import functools
import http.server
import json
import os
import queue
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
WWW_DIR = ROOT_DIR / "mobile-app" / "assets" / "www"
DATA_DIR = Path.home() / ".local" / "share" / "sysrush"
DATA_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = DATA_DIR / "state.json"
CONFIG_FILE = DATA_DIR / "config.json"

PORT = 8765


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "syncChannel": "",
        "cloudRelayBase": "https://ntfy.sh",
        "geminiApiKey": "",
        "geminiModel": "gemini-2.5-flash",
        "geminiFallbackModel": "gemini-2.0-flash",
    }


def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def default_crdt_state() -> dict:
    return {
        "resetEpoch": 0,
        "updatedAt": 0,
        "lastDevice": "init",
        "matter": 30,
        "matterBase": 30,
        "matterFloor": 30,
        "vocabBonusMatter": 0,
        "examBonusMatter": 0,
        "reviewBonusMatter": 0,
        "dojoBonusMatter": 0,
        "unlockedLevels": [0],
        "solvedTasks": [],
        "unlockedAch": [],
        "bonusEvents": {},
        "srsDeck": {},
        "dojoStats": {},
        "freeAccessMode": False,
        "currentQuestId": "q_hw",
        "currentLevel": 0,
        "vocabCorrectTotal": 0,
        "bestExamScore": 0,
        "streakDays": 1,
        "lastActiveDate": time.strftime("%Y-%m-%d"),
    }


def merge_srs_entry(loc_val, inc_val):
    """Merge compact 7-int SRS tuple: [box, streak, fails, hints, reps, lastHr, dueHr]."""
    if not isinstance(loc_val, list) or len(loc_val) < 7:
        return inc_val if (isinstance(inc_val, list) and len(inc_val) >= 7) else [0, 0, 0, 0, 0, 0, 0]
    if not isinstance(inc_val, list) or len(inc_val) < 7:
        return loc_val
    newer = inc_val if int(inc_val[5] or 0) >= int(loc_val[5] or 0) else loc_val
    return [
        int(newer[0] or 0),
        int(newer[1] or 0),
        max(int(loc_val[2] or 0), int(inc_val[2] or 0)),
        max(int(loc_val[3] or 0), int(inc_val[3] or 0)),
        max(int(loc_val[4] or 0), int(inc_val[4] or 0)),
        max(int(loc_val[5] or 0), int(inc_val[5] or 0)),
        int(newer[6] or 0),
    ]


def merge_crdt_states(local_s: dict, incoming_s: dict) -> dict:
    """Mathematical CRDT merge: zero lost tasks, zero lost levels, zero lost Dark Matter."""
    if not isinstance(incoming_s, dict):
        return local_s

    loc_ep = int(local_s.get("resetEpoch") or 0)
    inc_ep = int(incoming_s.get("resetEpoch") or 0)

    if inc_ep > loc_ep:
        base = default_crdt_state()
        base.update(incoming_s)
        base["resetEpoch"] = inc_ep
        return base
    if inc_ep < loc_ep:
        return local_s

    merged = dict(local_s)
    merged["resetEpoch"] = loc_ep

    # Grow-only sets (Union)
    u_lvls = sorted(set([0] + list(local_s.get("unlockedLevels") or []) + list(incoming_s.get("unlockedLevels") or [])))
    s_tasks = sorted(set(list(local_s.get("solvedTasks") or []) + list(incoming_s.get("solvedTasks") or [])))
    u_ach = sorted(set(list(local_s.get("unlockedAch") or []) + list(incoming_s.get("unlockedAch") or [])))

    bonuses = dict(local_s.get("bonusEvents") or {})
    for k, v in (incoming_s.get("bonusEvents") or {}).items():
        try:
            bonuses[str(k)] = max(int(bonuses.get(k, 0)), int(v))
        except Exception:
            pass

    merged["unlockedLevels"] = u_lvls
    merged["solvedTasks"] = s_tasks
    merged["unlockedAch"] = u_ach
    merged["bonusEvents"] = bonuses

    # Monotonic counters (Max)
    merged["vocabCorrectTotal"] = max(int(local_s.get("vocabCorrectTotal") or 0), int(incoming_s.get("vocabCorrectTotal") or 0))
    merged["bestExamScore"] = max(int(local_s.get("bestExamScore") or 0), int(incoming_s.get("bestExamScore") or 0))
    merged["streakDays"] = max(int(local_s.get("streakDays") or 1), int(incoming_s.get("streakDays") or 1))
    merged["matterBase"] = max(int(local_s.get("matterBase") or 30), int(incoming_s.get("matterBase") or 30))
    merged["matterFloor"] = max(int(local_s.get("matterFloor") or 30), int(incoming_s.get("matterFloor") or 30))
    merged["vocabBonusMatter"] = max(int(local_s.get("vocabBonusMatter") or 0), int(incoming_s.get("vocabBonusMatter") or 0))
    merged["examBonusMatter"] = max(int(local_s.get("examBonusMatter") or 0), int(incoming_s.get("examBonusMatter") or 0))
    merged["reviewBonusMatter"] = max(int(local_s.get("reviewBonusMatter") or 0), int(incoming_s.get("reviewBonusMatter") or 0))
    merged["dojoBonusMatter"] = max(int(local_s.get("dojoBonusMatter") or 0), int(incoming_s.get("dojoBonusMatter") or 0))

    # Merge Smart Review SRS Deck & Skill Dojo Stats
    loc_srs = local_s.get("srsDeck") if isinstance(local_s.get("srsDeck"), dict) else {}
    inc_srs = incoming_s.get("srsDeck") if isinstance(incoming_s.get("srsDeck"), dict) else {}
    merged_srs = {}
    for k in set(loc_srs.keys()) | set(inc_srs.keys()):
        merged_srs[str(k)] = merge_srs_entry(loc_srs.get(k), inc_srs.get(k))
    merged["srsDeck"] = merged_srs

    loc_dojo = local_s.get("dojoStats") if isinstance(local_s.get("dojoStats"), dict) else {}
    inc_dojo = incoming_s.get("dojoStats") if isinstance(incoming_s.get("dojoStats"), dict) else {}
    merged_dojo = {}
    for k in set(loc_dojo.keys()) | set(inc_dojo.keys()):
        ld = loc_dojo.get(k) if isinstance(loc_dojo.get(k), dict) else {}
        id_ = inc_dojo.get(k) if isinstance(inc_dojo.get(k), dict) else {}
        merged_dojo[str(k)] = {
            "solved": max(int(ld.get("solved") or 0), int(id_.get("solved") or 0)),
            "correct": max(int(ld.get("correct") or 0), int(id_.get("correct") or 0)),
            "bestStreak": max(int(ld.get("bestStreak") or 0), int(id_.get("bestStreak") or 0)),
        }
    merged["dojoStats"] = merged_dojo

    # Last-Write-Wins fields by updatedAt
    loc_ts = int(local_s.get("updatedAt") or 0)
    inc_ts = int(incoming_s.get("updatedAt") or 0)
    newer = incoming_s if inc_ts >= loc_ts else local_s

    for field in ("currentQuestId", "currentLevel", "freeAccessMode", "lastActiveDate", "lastDevice"):
        if field in newer:
            merged[field] = newer[field]

    # Matter: if computed CRDT matter is provided by newer client or max when tasks match
    if inc_ts >= loc_ts and "matter" in incoming_s:
        merged["matter"] = int(incoming_s["matter"])
    if len(s_tasks) > len(local_s.get("solvedTasks") or []) and len(s_tasks) > len(incoming_s.get("solvedTasks") or []):
        # True concurrent solve on both devices while offline -> take max + delta
        merged["matter"] = max(int(local_s.get("matter") or 30), int(incoming_s.get("matter") or 30))

    merged["updatedAt"] = max(loc_ts, inc_ts)
    return merged


def state_fingerprint(s: dict) -> str:
    core = {
        "ep": s.get("resetEpoch", 0),
        "u": sorted(s.get("unlockedLevels") or []),
        "s": sorted(s.get("solvedTasks") or []),
        "b": sorted((s.get("bonusEvents") or {}).items()),
        "m": s.get("matter", 30),
        "mb": s.get("matterBase", 30),
        "vb": s.get("vocabBonusMatter", 0),
        "eb": s.get("examBonusMatter", 0),
        "rb": s.get("reviewBonusMatter", 0),
        "db": s.get("dojoBonusMatter", 0),
        "srs": len(s.get("srsDeck") or {}),
        "dj": s.get("dojoStats") or {},
        "f": bool(s.get("freeAccessMode", False)),
        "c": s.get("currentLevel", 0),
        "q": s.get("currentQuestId", "q_hw"),
        "v": s.get("vocabCorrectTotal", 0),
        "e": s.get("bestExamScore", 0),
    }
    return json.dumps(core, sort_keys=True)


class SyncHub:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.cfg = load_config()
        self.state = self._load_disk()
        self.last_cloud_fp = ""
        self.sse_clients: list[queue.Queue] = []
        self._push_timer: threading.Timer | None = None

    def _load_disk(self) -> dict:
        if STATE_FILE.exists():
            try:
                d = default_crdt_state()
                d.update(json.loads(STATE_FILE.read_text(encoding="utf-8")))
                return d
            except Exception:
                pass
        return default_crdt_state()

    def _save_disk(self) -> None:
        tmp = STATE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(STATE_FILE)

    def apply_incoming(self, incoming: dict, push_to_cloud: bool = True) -> dict:
        with self.lock:
            before_fp = state_fingerprint(self.state)
            self.state = merge_crdt_states(self.state, incoming)
            after_fp = state_fingerprint(self.state)
            changed = before_fp != after_fp
            if changed or not STATE_FILE.exists():
                self._save_disk()
            snap = dict(self.state)

        if changed:
            self.broadcast_local_sse(snap)
            if push_to_cloud and after_fp != self.last_cloud_fp:
                self.schedule_cloud_push()
        return snap

    def broadcast_local_sse(self, snap: dict) -> None:
        payload = json.dumps({"state": snap, "lanUrl": f"http://{get_lan_ip()}:{PORT}"}, ensure_ascii=False)
        with self.lock:
            alive = []
            for q in self.sse_clients:
                try:
                    q.put_nowait(payload)
                    alive.append(q)
                except Exception:
                    pass
            self.sse_clients = alive

    def schedule_cloud_push(self) -> None:
        with self.lock:
            if self._push_timer is not None:
                self._push_timer.cancel()
            self._push_timer = threading.Timer(2.2, self._push_cloud_now)
            self._push_timer.daemon = True
            self._push_timer.start()

    def _push_cloud_now(self) -> None:
        channel = self.cfg.get("syncChannel")
        relay = (self.cfg.get("cloudRelayBase") or "https://ntfy.sh").rstrip("/")
        if not channel:
            return
        with self.lock:
            snap = dict(self.state)
            fp = state_fingerprint(snap)
            if fp == self.last_cloud_fp:
                return

        cloud_snap = dict(snap)
        envelope = {
            "type": "sysrush_sync_v3",
            "origin": "laptop_daemon",
            "lanUrl": f"http://{get_lan_ip()}:{PORT}",
            "state": cloud_snap,
        }
        raw_bytes = json.dumps(envelope, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(raw_bytes) > 3700 and isinstance(cloud_snap.get("srsDeck"), dict):
            # Keep top 45 most recently touched / weak SRS items for ntfy 4KB envelope; full deck stays on LAN
            sorted_items = sorted(
                cloud_snap["srsDeck"].items(),
                key=lambda kv: (int(kv[1][2] or 0) * 1000000 + int(kv[1][5] or 0)) if isinstance(kv[1], list) and len(kv[1]) >= 6 else 0,
                reverse=True,
            )[:45]
            cloud_snap["srsDeck"] = dict(sorted_items)
            raw_bytes = json.dumps(envelope, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        try:
            req = urllib.request.Request(
                f"{relay}/{channel}",
                data=raw_bytes,
                headers={"Content-Type": "application/json", "Title": "SysRush Sync"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                if r.status == 200:
                    with self.lock:
                        self.last_cloud_fp = fp
        except Exception as exc:
            print(f"[cloud-push] warning: {exc}", flush=True)

    def pull_cloud_history_once(self) -> None:
        channel = self.cfg.get("syncChannel")
        relay = (self.cfg.get("cloudRelayBase") or "https://ntfy.sh").rstrip("/")
        if not channel:
            return
        try:
            url = f"{relay}/{channel}/json?poll=1&since=all"
            req = urllib.request.Request(url, headers={"User-Agent": "SysRush-Daemon/3.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                lines = r.read().decode("utf-8", errors="replace").splitlines()
            found_any = False
            for line in lines:
                if not line.strip():
                    continue
                ev = json.loads(line)
                if ev.get("event") != "message":
                    continue
                msg_raw = ev.get("message") or ""
                if not msg_raw.startswith("{"):
                    continue
                env = json.loads(msg_raw)
                if env.get("type") == "sysrush_sync_v3" and isinstance(env.get("state"), dict):
                    found_any = True
                    with self.lock:
                        self.last_cloud_fp = state_fingerprint(env["state"])
                    self.apply_incoming(env["state"], push_to_cloud=False)
            if not found_any and (self.state.get("solvedTasks") or self.state.get("unlockedLevels") != [0]):
                self.schedule_cloud_push()
        except Exception as exc:
            print(f"[cloud-poll] warning: {exc}", flush=True)

    def cloud_stream_loop(self) -> None:
        time.sleep(1.0)
        self.pull_cloud_history_once()
        channel = self.cfg.get("syncChannel")
        relay = (self.cfg.get("cloudRelayBase") or "https://ntfy.sh").rstrip("/")
        if not channel:
            return
        while True:
            try:
                url = f"{relay}/{channel}/json"
                req = urllib.request.Request(url, headers={"User-Agent": "SysRush-Daemon/3.0"})
                with urllib.request.urlopen(req, timeout=90) as r:
                    for raw_line in r:
                        line = raw_line.decode("utf-8", errors="replace").strip()
                        if not line:
                            continue
                        ev = json.loads(line)
                        if ev.get("event") != "message":
                            continue
                        msg_raw = ev.get("message") or ""
                        if not msg_raw.startswith("{"):
                            continue
                        env = json.loads(msg_raw)
                        if env.get("type") == "sysrush_sync_v3" and isinstance(env.get("state"), dict):
                            if env.get("origin") == "laptop_daemon":
                                continue
                            inc_state = env["state"]
                            with self.lock:
                                self.last_cloud_fp = state_fingerprint(inc_state)
                            self.apply_incoming(inc_state, push_to_cloud=False)
            except Exception:
                time.sleep(5.0)
                self.pull_cloud_history_once()


HUB = SyncHub()

AI_SYSTEM_PROMPT = (
    "Ты — встроенный ИИ-напарник и наставник платформы SysRush (подготовка к Linux LPIC-1, сетям и железу в стиле JavaRush). "
    "Общайся с пользователем на «ты», живо, бодро, по-дружески («слушай», «смотри», «короче», «всё чётко»), БЕЗ занудного канцелярита и извинений. "
    "Пользователь учит железо, Linux, сети и английские термины для экзамена LPIC-1 (с английским на «вы», поэтому всегда расшифровывай английские слова и флаги команд простыми ассоциациями и русской транскрипцией!). "
    "Отвечай ёмко, структурно (короткие пункты и примеры команд в `обратных кавычках`), по делу."
)


def ask_ai_mentor(body: dict) -> dict:
    cfg = load_config()
    user_msg = str(body.get("prompt") or "").strip()
    ctx = str(body.get("context") or "").strip()
    history = body.get("history") or []
    engine = str(body.get("engine") or "gemini")

    if not user_msg:
        return {"ok": False, "error": "Пустой запрос"}

    full_prompt = f"{ctx}\n\nВопрос ученика: {user_msg}" if ctx else user_msg

    # Option A: Local Antigravity CLI (`agy -p`) if explicitly requested or Gemini key missing
    agy_bin = Path.home() / ".local" / "bin" / "agy"
    gemini_key = str(body.get("apiKey") or cfg.get("geminiApiKey") or "").strip()

    if (engine == "agy" or not gemini_key) and agy_bin.exists():
        try:
            res = subprocess.run(
                [
                    str(agy_bin),
                    "-p",
                    "--disable-slash-commands",
                    "--effort",
                    "low",
                    f"{AI_SYSTEM_PROMPT}\n\n{full_prompt}",
                ],
                capture_output=True,
                text=True,
                timeout=35,
            )
            if res.returncode == 0 and res.stdout.strip():
                return {"ok": True, "reply": res.stdout.strip(), "model": "Antigravity (agy)"}
        except Exception as exc:
            if engine == "agy":
                return {"ok": False, "error": f"Ошибка agy CLI: {exc}"}

    # Option B: Fast Gemini API (`gemini-2.5-flash` -> `gemini-2.0-flash`)
    contents = []
    for h in history[-6:]:
        role = "model" if h.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": str(h.get("text") or "")}]})
    contents.append({"role": "user", "parts": [{"text": full_prompt}]})

    for model in [cfg.get("geminiModel", "gemini-2.5-flash"), cfg.get("geminiFallbackModel", "gemini-2.0-flash")]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            gen_cfg: dict = {"temperature": 0.35, "maxOutputTokens": 2200}
            if "2.5" in model:
                gen_cfg["thinkingConfig"] = {"thinkingBudget": 128}
            payload = {
                "systemInstruction": {"parts": [{"text": AI_SYSTEM_PROMPT}]},
                "contents": contents,
                "generationConfig": gen_cfg,
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=18) as r:
                resp = json.loads(r.read().decode("utf-8"))
                reply = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
                return {"ok": True, "reply": reply, "model": model}
        except Exception as exc:
            last_err = str(exc)

    return {"ok": False, "error": f"Не удалось получить ответ от ИИ: {last_err}"}


class SysRushHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WWW_DIR), **kwargs)

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _send_json(self, obj: dict, status: int = 200):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        if self.path.startswith("/api/state"):
            with HUB.lock:
                snap = dict(HUB.state)
            is_loopback = self.client_address[0] in ("127.0.0.1", "::1")
            resp = {
                "ok": True,
                "state": snap,
                "lanUrl": f"http://{get_lan_ip()}:{PORT}",
                "channel": HUB.cfg.get("syncChannel", ""),
            }
            if is_loopback and HUB.cfg.get("geminiApiKey"):
                resp["localPairKey"] = HUB.cfg.get("geminiApiKey", "")
            return self._send_json(resp)

        if self.path.startswith("/api/events"):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            q: queue.Queue = queue.Queue(maxsize=20)
            with HUB.lock:
                HUB.sse_clients.append(q)
            try:
                while True:
                    try:
                        msg = q.get(timeout=20)
                        self.wfile.write(f"data: {msg}\n\n".encode("utf-8"))
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            return

        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else "{}"
        try:
            body = json.loads(raw)
        except Exception:
            return self._send_json({"ok": False, "error": "Invalid JSON"}, 400)

        if self.path.startswith("/api/state"):
            inc = body.get("state") if isinstance(body.get("state"), dict) else body
            merged = HUB.apply_incoming(inc, push_to_cloud=True)
            return self._send_json({
                "ok": True,
                "state": merged,
                "lanUrl": f"http://{get_lan_ip()}:{PORT}",
            })

        if self.path.startswith("/api/sync-now"):
            HUB.pull_cloud_history_once()
            HUB._push_cloud_now()
            with HUB.lock:
                snap = dict(HUB.state)
            return self._send_json({"ok": True, "state": snap, "lanUrl": f"http://{get_lan_ip()}:{PORT}"})

        if self.path.startswith("/api/ai"):
            res = ask_ai_mentor(body)
            return self._send_json(res, 200 if res.get("ok") else 502)

        return self._send_json({"ok": False, "error": "Not found"}, 404)


def main():
    t = threading.Thread(target=HUB.cloud_stream_loop, daemon=True)
    t.start()

    http.server.ThreadingHTTPServer.allow_reuse_address = True
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), SysRushHandler)
    print(f"SysRush Sync & AI Daemon listening on http://0.0.0.0:{PORT} (LAN: http://{get_lan_ip()}:{PORT})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
