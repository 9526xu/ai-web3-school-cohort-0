#!/usr/bin/env python3
"""Small local helper for the Web3 Career Build Agent API."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


BASE_URL = "https://web3career.build"


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def call_agent(procedure: str, input_payload: dict | None = None) -> dict:
    api_key = os.environ.get("WCB_SECRET_API_KEY")
    if not api_key:
        raise SystemExit("Missing WCB_SECRET_API_KEY. Add it to .env first.")

    body = json.dumps(
        {
            "procedure": procedure,
            "input": input_payload or {},
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        f"{BASE_URL}/api/agent/call",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {error.code}: {detail}") from error


def compact_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    load_dotenv(repo_root / ".env")

    parser = argparse.ArgumentParser(description="Call WCB Agent API.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("profile", help="Read my WCB profile.")
    subparsers.add_parser("permissions", help="Read my WCB permissions.")
    subparsers.add_parser("tasks", help="Read learner tasks.")
    subparsers.add_parser("history", help="Read my task history.")

    events_parser = subparsers.add_parser("events", help="Read learner events.")
    events_parser.add_argument("--start", required=True, help="ISO start datetime.")
    events_parser.add_argument("--end", required=True, help="ISO end datetime.")

    args = parser.parse_args()
    program_id = os.environ.get("WCB_PROGRAM_ID")
    track_id = os.environ.get("WCB_TRACK_ID")

    if args.command == "profile":
        result = call_agent("users.getProfile")
    elif args.command == "permissions":
        result = call_agent("users.getMyPermissions")
    elif args.command == "tasks":
        payload = {}
        if program_id:
            payload["programId"] = program_id
        if track_id:
            payload["trackId"] = track_id
        result = call_agent("tasks.listForLearner", payload)
    elif args.command == "history":
        result = call_agent("tasks.myTaskHistory")
    elif args.command == "events":
        payload = {
            "rangeStart": args.start,
            "rangeEnd": args.end,
        }
        if program_id:
            payload["programId"] = program_id
        result = call_agent("events.listForLearner", payload)
    else:
        parser.error(f"Unknown command: {args.command}")

    print(compact_json(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())

