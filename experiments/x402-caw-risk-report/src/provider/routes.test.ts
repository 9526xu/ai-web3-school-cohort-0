import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, type DemoConfig } from "../shared/config.js";
import { requestFingerprint } from "../shared/fingerprint.js";
import { paymentRequirementFromConfig } from "../shared/payment.js";
import type { PaymentRequired } from "@x402/core/types";
import type { FacilitatorClient } from "@x402/core/server";
import { createProviderApp } from "./routes.js";
import { createSqliteProviderStore, type ProviderStore } from "./store.js";

describe("provider unpaid risk report quote path", () => {
  let tempDir: string;
  let config: DemoConfig;
  let store: ProviderStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "x402-caw-provider-"));
    config = loadConfig({
      PORT: "4021",
      PROVIDER_BASE_URL: "http://localhost:4021",
      PROVIDER_PAY_TO_ADDRESS: "0x0000000000000000000000000000000000000000",
      X402_NETWORK: "eip155:84532",
      X402_PRICE_USDC: "0.005",
      X402_TOKEN_SYMBOL: "USDC",
      X402_FACILITATOR_URL: "https://x402.org/facilitator",
      SQLITE_PATH: path.join(tempDir, "risk-report-demo.sqlite"),
      AUDIT_DIR: path.join(tempDir, "audits")
    });
    store = createSqliteProviderStore(config.sqlitePath);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("rejects invalid EVM addresses before creating an order", async () => {
    const app = createProviderApp(config, store, { facilitatorClient: fakeFacilitator(config) });

    const response = await app.request("/risk-report?address=not-an-address", {
      headers: { accept: "application/json" }
    });

    expect(response.status).toBe(400);
    expect(store.getPaymentsForOrder("missing")).toEqual([]);
  });

  it("quotes a valid unpaid request without delivering the report", async () => {
    const app = createProviderApp(config, store, { facilitatorClient: fakeFacilitator(config) });
    const address = "0x0000000000000000000000000000000000000001";
    const response = await app.request(`/risk-report?address=${address}`, {
      headers: { accept: "application/json" }
    });
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(402);
    const paymentRequired = decodePaymentRequired(response.headers.get("payment-required"));
    const fingerprint = requestFingerprint({
      method: "GET",
      path: "/risk-report",
      address,
      payment: paymentRequirementFromConfig(config)
    });
    const order = store.getOrderByFingerprint(fingerprint);

    expect(body).toMatchObject({ error: "payment_required" });
    expect(body).not.toHaveProperty("report");
    expect(paymentRequired.resource.url).toBe(`${config.providerBaseUrl}/risk-report`);
    expect(paymentRequired.accepts[0]).toMatchObject({
      scheme: "exact",
      network: config.x402Network,
      payTo: config.providerPayToAddress
    });
    expect(order).toMatchObject({
      requestAddress: address,
      status: "payment_required",
      requestFingerprint: fingerprint
    });
    expect(store.getPaymentsForOrder(order?.id ?? "")[0]).toMatchObject({
      status: "required",
      price: config.x402PriceUsdc,
      network: config.x402Network,
      token: config.x402TokenSymbol,
      payTo: config.providerPayToAddress
    });
    expect(existsSync(config.sqlitePath)).toBe(true);
  });

  it("reuses the existing order and required payment record for the same unpaid request", async () => {
    const app = createProviderApp(config, store, { facilitatorClient: fakeFacilitator(config) });
    const address = "0x0000000000000000000000000000000000000001";

    await app.request(`/risk-report?address=${address}`, { headers: { accept: "application/json" } });
    await app.request(`/risk-report?address=${address}`, { headers: { accept: "application/json" } });

    const fingerprint = requestFingerprint({
      method: "GET",
      path: "/risk-report",
      address,
      payment: paymentRequirementFromConfig(config)
    });
    const order = store.getOrderByFingerprint(fingerprint);
    const payments = store.getPaymentsForOrder(order?.id ?? "");

    expect(order?.status).toBe("payment_required");
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("required");
  });
});

function decodePaymentRequired(header: string | null): PaymentRequired {
  if (!header) {
    throw new Error("missing payment-required header");
  }
  return JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as PaymentRequired;
}

function fakeFacilitator(config: DemoConfig): FacilitatorClient {
  return {
    async getSupported() {
      return {
        kinds: [{ x402Version: 2, scheme: "exact", network: config.x402Network as `${string}:${string}` }],
        extensions: [],
        signers: {}
      };
    },
    async verify() {
      return { isValid: false, invalidReason: "test", invalidMessage: "test facilitator does not verify" };
    },
    async settle() {
      return {
        success: false,
        errorReason: "test",
        errorMessage: "test facilitator does not settle",
        transaction: "",
        network: config.x402Network as `${string}:${string}`
      };
    }
  };
}
