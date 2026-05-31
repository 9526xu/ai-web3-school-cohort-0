# x402 + CAW Risk Report Demo

Runnable MVP workspace for the x402 Paywall + Cobo Agentic Wallet risk report flow.

This directory is isolated from the learning notes in `hackathon/` and `tasks/`. It holds the demo runtime only: a TypeScript/Hono provider server, a reference consumer CLI, local persistence placeholders, and local audit outputs.

## Runtime Stack

- Node.js + TypeScript
- Hono for the Provider Server
- `tsx` for local execution
- Vitest/TypeScript checks for the first scaffold
- SQLite prepared as the local persistence target for later slices

No Next.js app is included in this slice because the MVP does not have a browser UI yet.

## Layout

```text
src/
  provider/   Hono server, route wiring, report generation, x402 boundary
  consumer/   Reference buyer CLI, CAW boundary, precheck and audit helpers
  shared/     Config, ids, fingerprints, and shared types
data/         Local SQLite files at runtime, ignored by git
audits/       Local audit JSON outputs at runtime, ignored by git
```

## Local Setup

```bash
npm install
npm run check
npm run provider
```

In another terminal:

```bash
npm run consumer -- --address 0x0000000000000000000000000000000000000001
```

The current scaffold proves the runtime shape. x402 seller middleware, SQLite records, and real CAW pact/payment calls are intentionally left for the next implementation issues.

## Git Safety

Do not commit `.env`, SQLite runtime files, audit JSON outputs, CAW credentials, pact-scoped API keys, wallet private keys, seed phrases, or real private account identifiers. The local `.gitignore` keeps those outputs out of git.
