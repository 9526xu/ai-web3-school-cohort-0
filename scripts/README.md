# WCB Agent API Helper

Use this helper to read your Web3 Career Build learning data from the local machine.

References:

- Agent API docs: https://web3career.build/llms.txt
- Live catalog endpoint: https://web3career.build/api/agent/catalog
- Learning Agent prompt: https://aiweb3.school/learning-agent.zh.txt

## Setup

1. Generate a Secret API Key in WCB profile settings:

   ```text
   https://web3career.build/profile?tab=account
   ```

2. Fill local `.env`:

   ```text
   WCB_AGENT_SECRET_API_KEY=your_secret_api_key
   WCB_PROGRAM_ID=cmnx791nl008sru0167pzp4ki
   WCB_TRACK_ID=
   WCB_STUDENT_NUMBER=your_student_number
   WCB_GITHUB_NAME=your_github_name
   WCB_EMAIL=your_email
   ```

   Keep `.env` local. It is ignored by git.
   `WCB_SECRET_API_KEY` is still supported for older local setups, but new setups should use `WCB_AGENT_SECRET_API_KEY`.

## Commands

```bash
./scripts/wcb_agent.py catalog
./scripts/wcb_agent.py profile
./scripts/wcb_agent.py permissions
./scripts/wcb_agent.py tasks
./scripts/wcb_agent.py tasks-by-ids cmp9vktcp0p0dmw012gq36eke cmp9vkuxe0p17mw019n0nfipz
./scripts/wcb_agent.py history <task_id>
./scripts/wcb_agent.py events --start 2026-05-18T00:00:00.000Z --end 2026-05-25T00:00:00.000Z
./scripts/wcb_agent.py call events.listForLearner --input '{"programId":"cmnx791nl008sru0167pzp4ki","rangeStart":"2026-05-24T00:00:00.000Z","rangeEnd":"2026-05-31T00:00:00.000Z"}'
```

## Notes

- Base URL: `https://web3career.build`
- Primary endpoint: `POST /api/agent/call`
- Catalog endpoint: `GET /api/agent/catalog`
- `WCB_PROGRAM_ID` is the AI x Web3 School program id for this repo.
- `WCB_TRACK_ID` can stay empty until a task API response requires a track id.
- If `tasks` cannot list tasks without a track id, read events first and use `tasks-by-ids` with the `taskIds` from the event response.
- Do not paste API keys into chat, commit history, issues, or screenshots.
- Treat write procedures such as `tasks.submitEvidence` as manual-confirmation steps: prepare the payload, review it, then submit only after explicit confirmation.
