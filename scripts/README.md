# WCB Agent API Helper

Use this helper to read your Web3 Career Build learning data from the local machine.

## Setup

1. Generate a Secret API Key in WCB profile settings:

   ```text
   https://web3career.build/profile?tab=account
   ```

2. Fill local `.env`:

   ```text
   WCB_SECRET_API_KEY=your_secret_api_key
   WCB_PROGRAM_ID=
   WCB_TRACK_ID=
   ```

   Keep `.env` local. It is ignored by git.

## Commands

```bash
./scripts/wcb_agent.py profile
./scripts/wcb_agent.py permissions
./scripts/wcb_agent.py tasks
./scripts/wcb_agent.py history
./scripts/wcb_agent.py events --start 2026-05-18T00:00:00.000Z --end 2026-05-25T00:00:00.000Z
```

## Notes

- `WCB_PROGRAM_ID` and `WCB_TRACK_ID` can stay empty at first.
- If the API response shows that task calls require a program or track id, fill those values later.
- Do not paste API keys into chat, commit history, issues, or screenshots.

