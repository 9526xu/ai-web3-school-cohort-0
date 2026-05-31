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
USER_AGENT = "ai-web3-school-learning-agent/1.0"


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


def get_api_key() -> str:
    api_key = os.environ.get("WCB_AGENT_SECRET_API_KEY") or os.environ.get("WCB_SECRET_API_KEY")
    if not api_key:
        raise SystemExit(
            "Missing WCB_AGENT_SECRET_API_KEY. Add it to .env first. "
            "WCB_SECRET_API_KEY is also supported for older local setups."
        )

    return api_key


def call_catalog() -> dict:
    request = urllib.request.Request(
        f"{BASE_URL}/api/agent/catalog",
        method="GET",
        headers={
            "Authorization": f"Bearer {get_api_key()}",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {error.code}: {detail}") from error


def call_agent(procedure: str, input_payload: dict | None = None) -> dict:
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
            "Authorization": f"Bearer {get_api_key()}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
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

    subparsers.add_parser("catalog", help="Read live WCB Agent API catalog.")
    subparsers.add_parser("profile", help="Read my WCB profile.")
    subparsers.add_parser("permissions", help="Read my WCB permissions.")
    subparsers.add_parser("tasks", help="Read learner tasks.")
    tasks_by_ids_parser = subparsers.add_parser("tasks-by-ids", help="Read learner tasks by ids.")
    tasks_by_ids_parser.add_argument("task_ids", nargs="+", help="Task ids to read.")
    tasks_by_ids_parser.add_argument("--locale", default="zh", help="Task locale.")
    history_parser = subparsers.add_parser("history", help="Read my task history.")
    history_parser.add_argument("task_id", help="Task id to read history for.")

    events_parser = subparsers.add_parser("events", help="Read learner events.")
    events_parser.add_argument("--start", required=True, help="ISO start datetime.")
    events_parser.add_argument("--end", required=True, help="ISO end datetime.")

    call_parser = subparsers.add_parser("call", help="Call any WCB Agent API procedure.")
    call_parser.add_argument("procedure", help="tRPC procedure path.")
    call_parser.add_argument("--input", default="{}", help="JSON input payload.")

    args = parser.parse_args()
    program_id = os.environ.get("WCB_PROGRAM_ID")
    track_id = os.environ.get("WCB_TRACK_ID")

    if args.command == "catalog":
        result = call_catalog()
    elif args.command == "profile":
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
    elif args.command == "tasks-by-ids":
        if not program_id:
            raise SystemExit("Missing WCB_PROGRAM_ID. Add it to .env first.")
        result = call_agent(
            "tasks.listForLearnerByIds",
            {
                "programId": program_id,
                "taskIds": args.task_ids,
                "locale": args.locale,
            },
        )
    elif args.command == "history":
        result = call_agent("tasks.myTaskHistory", {"taskId": args.task_id})
    elif args.command == "events":
        payload = {
            "rangeStart": args.start,
            "rangeEnd": args.end,
        }
        if program_id:
            payload["programId"] = program_id
        result = call_agent("events.listForLearner", payload)
    elif args.command == "call":
        try:
            payload = json.loads(args.input)
        except json.JSONDecodeError as error:
            raise SystemExit(f"Invalid JSON for --input: {error}") from error
        if not isinstance(payload, dict):
            raise SystemExit("--input must be a JSON object.")
        result = call_agent(args.procedure, payload)
    else:
        parser.error(f"Unknown command: {args.command}")

    print(compact_json(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
