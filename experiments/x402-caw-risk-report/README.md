# x402 + CAW Risk Report Demo

Runnable MVP for buying one on-chain address risk report through an x402 paywall, with Cobo Agentic Wallet (CAW) acting as the task-level authorization boundary.

The learning goal is the commerce loop: quote, local policy check, scoped Pact approval, payment proof, paid retry, report validation, and audit evidence. This is not a marketplace, escrow system, reputation registry, real risk-data provider, or browser UI.

## Boundaries

- Provider Server: Hono API at `GET /risk-report?address=...`. It returns `402 Payment Required` for unpaid requests, verifies and settles x402 payment headers through the official seller middleware, then persists the delivered report hash.
- Reference Consumer CLI: demo buyer. It reads the 402 requirement, checks price/payee/network/token/resource, submits a CAW Pact, waits for human approval, executes the approved payment path, retries with payment proof, validates the report, and writes a redacted audit JSON.
- CAW Pact: task-level authorization. Human approval of the Pact authorizes later execution within strict policy bounds. It is not the same UX as a wallet popup for every transaction. Use `always_review` in future versions if every operation should require owner review.
- x402 settlement proves payment. Report validation proves service delivery quality for this MVP. Both are recorded because one does not replace the other.

## Setup

```bash
cd experiments/x402-caw-risk-report
npm install
npm run check
npm run test
```

Copy `.env.example` to `.env` locally if you use env loading in your shell. Do not commit `.env`.

Important values:

- `PROVIDER_PAY_TO_ADDRESS`: provider receiving address.
- `X402_NETWORK`, `X402_TOKEN_SYMBOL`, `X402_PRICE_USDC`: quoted payment requirement.
- `X402_FACILITATOR_URL`: x402 facilitator endpoint.
- `CAW_API_BASE_URL`, `CAW_AGENT_CREDENTIAL`: real CAW CLI/API access. Keep secret.
- `CAW_X402_PAYMENT_HEADER_COMMAND`: optional local adapter command that prints `{"paymentSignatureHeader":"..."}`. This is required for a full live CAW -> x402 paid retry until the CAW CLI exposes x402 payment headers directly.

## Run Provider

```bash
npm run provider
```

Unpaid quote check:

```bash
curl -i \
  -H 'Accept: application/json' \
  'http://localhost:4021/risk-report?address=0x0000000000000000000000000000000000000001'
```

Expected:

- HTTP `402 Payment Required`
- `PAYMENT-REQUIRED` header
- JSON `{ "error": "payment_required", ... }`
- SQLite runtime state under `data/`
- no report body before payment

Invalid address check:

```bash
curl -i 'http://localhost:4021/risk-report?address=not-an-address'
```

Expected: HTTP `400`.

## Run Consumer

Precheck only:

```bash
npm run consumer -- \
  --precheck-only \
  --address 0x0000000000000000000000000000000000000001 \
  --api http://localhost:4021/risk-report \
  --max-price-usdc 0.005 \
  --expected-payee 0x0000000000000000000000000000000000000000 \
  --expected-token USDC \
  --expected-network eip155:84532
```

Full flow:

```bash
npm run consumer -- \
  --address 0x0000000000000000000000000000000000000001 \
  --api http://localhost:4021/risk-report \
  --max-price-usdc 0.005 \
  --expected-payee 0x0000000000000000000000000000000000000000 \
  --expected-token USDC \
  --expected-network eip155:84532
```

The full flow submits a Pact and waits for approval. If the Pact is denied, times out, or CAW cannot produce an x402 `PAYMENT-SIGNATURE`, the CLI stops safely and writes a failure audit. It must not loop payment attempts.

## Failure Checks

- Address format rejection: call Provider with `address=not-an-address`; expect `400`.
- Over-budget refusal: run Consumer with `--max-price-usdc 0.001`; expect no Pact/payment and an audit failure reason.
- Payee mismatch refusal: use a different `--expected-payee`; expect no payment.
- Token/network mismatch refusal: use mismatched `--expected-token` or `--expected-network`; expect no payment.
- CAW policy denial: approve a narrower Pact than the required payment or reuse a completed Pact; expect safe failure and no paid retry loop.
- Successful payment and delivery: configure CAW plus x402 payment proof adapter; expect paid retry `200`, `PAYMENT-RESPONSE`, validated report, and final audit.
- Cached retry: retry the same payment id/proof; Provider should return cached delivery without another settlement.
- Conflict behavior: reuse the same payment id for a different address; Provider should return `409`.

## Generated Files

- `data/`: local SQLite files. Ignored by git.
- `audits/`: local audit JSON. Ignored by git.

Never commit CAW credentials, pact-scoped API keys, wallet private keys, seed phrases, raw secret-bearing Pact payloads, generated SQLite databases, or private audit records.
