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

Verify the unpaid Provider quote path:

```bash
curl -i \
  -H 'Accept: application/json' \
  'http://localhost:4021/risk-report?address=0x0000000000000000000000000000000000000001'
```

Expected result for a valid unpaid request:

- HTTP `402 Payment Required`
- `PAYMENT-REQUIRED` response header from the x402 middleware
- JSON body explaining that payment is required
- a local SQLite database under `data/`
- no risk report body before payment

The Consumer CLI can parse this `402` response and stop after local policy precheck:

```bash
npm run consumer -- \
  --address 0x0000000000000000000000000000000000000001 \
  --api http://localhost:4021/risk-report \
  --max-price-usdc 0.005 \
  --expected-payee 0x0000000000000000000000000000000000000000 \
  --expected-token USDC \
  --expected-network eip155:84532
```

If the payment requirement is out of policy, the CLI writes a failure audit record and does not create a CAW Pact, submit a payment, or retry as paid.

The current Provider path quotes unpaid requests and persists the initial local order/payment record. Paid settlement, idempotent paid retry, and real CAW pact/payment calls are intentionally left for later implementation issues.

## Git Safety

Do not commit `.env`, SQLite runtime files, audit JSON outputs, CAW credentials, pact-scoped API keys, wallet private keys, seed phrases, or real private account identifiers. The local `.gitignore` keeps those outputs out of git.
