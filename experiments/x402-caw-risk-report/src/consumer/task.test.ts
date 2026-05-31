import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../shared/config.js";
import { runConsumerPrecheckTask } from "./task.js";
import type { PaymentRequired } from "@x402/core/types";

describe("runConsumerPrecheckTask", () => {
  it("refuses an out-of-policy 402 locally and writes a failure audit without payment", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "x402-caw-consumer-"));
    try {
      const config = loadConfig({
        PROVIDER_BASE_URL: "http://localhost:4021",
        PROVIDER_PAY_TO_ADDRESS: "0x0000000000000000000000000000000000000000",
        X402_NETWORK: "eip155:84532",
        X402_PRICE_USDC: "0.005",
        X402_TOKEN_SYMBOL: "USDC",
        X402_FACILITATOR_URL: "https://x402.org/facilitator",
        SQLITE_PATH: path.join(tempDir, "db.sqlite"),
        AUDIT_DIR: path.join(tempDir, "audits")
      });
      const response = new Response("{}", {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": Buffer.from(
            JSON.stringify(paymentRequiredFixture({ payTo: "0x0000000000000000000000000000000000000002" }))
          ).toString("base64url")
        }
      });
      const fetchFn = async () => response;

      const result = await runConsumerPrecheckTask(
        {
          address: "0x0000000000000000000000000000000000000001",
          maxPriceUsdc: "0.005",
          expectedPayTo: config.providerPayToAddress,
          expectedNetwork: config.x402Network,
          expectedTokenSymbol: config.x402TokenSymbol,
          expectedResource: "/risk-report"
        },
        { config, fetchFn, now: new Date("2026-05-31T00:00:00.000Z") }
      );
      const audit = JSON.parse(await readFile(result.auditPath, "utf8")) as {
        precheck: { status: string; reason: string };
        payment: { status: string };
      };

      expect(result.paymentAttempted).toBe(false);
      expect(result.precheck).toMatchObject({ status: "failed", reason: "payee mismatch" });
      expect(audit.precheck).toMatchObject({ status: "failed", reason: "payee mismatch" });
      expect(audit.payment).toEqual({
        status: "not_attempted",
        reason: "Local precheck refused payment: payee mismatch"
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function paymentRequiredFixture(overrides: Partial<PaymentRequired["accepts"][number]> = {}): PaymentRequired {
  return {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: "http://localhost:4021/risk-report",
      description: "On-chain address risk report",
      mimeType: "application/json"
    },
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        asset: "USDC",
        amount: "5000",
        payTo: "0x0000000000000000000000000000000000000000",
        maxTimeoutSeconds: 1800,
        extra: {
          priceUsdc: "0.005",
          tokenSymbol: "USDC"
        },
        ...overrides
      }
    ]
  };
}
