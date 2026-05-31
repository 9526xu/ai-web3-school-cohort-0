import { Hono } from "hono";
import type { DemoConfig } from "../shared/config.js";
import { requestFingerprint } from "../shared/fingerprint.js";
import { generateRiskReport } from "./report.js";
import { normalizeEvmAddress } from "./schema.js";
import { dbPlan } from "./db.js";
import type { ProviderStore } from "./store.js";
import { createSqliteProviderStore } from "./store.js";
import { createX402PaymentMiddleware, describeX402Boundary, paymentRequirementFromConfig } from "./x402.js";
import type { FacilitatorClient } from "@x402/core/server";

export function createProviderApp(
  config: DemoConfig,
  store: ProviderStore = createSqliteProviderStore(config.sqlitePath),
  options: { facilitatorClient?: FacilitatorClient; syncFacilitatorOnStart?: boolean } = {}
): Hono {
  const app = new Hono();

  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      stack: "typescript+hono+node",
      db: dbPlan(config),
      x402: describeX402Boundary()
    });
  });

  app.use("/risk-report", async (c, next) => {
    const rawAddress = c.req.query("address");
    if (!rawAddress) {
      return c.json({ error: "address is required" }, 400);
    }

    try {
      const address = normalizeEvmAddress(rawAddress);
      const payment = paymentRequirementFromConfig(config);
      const fingerprint = requestFingerprint({
        method: "GET",
        path: "/risk-report",
        address,
        payment
      });
      store.ensureRequiredPayment({
        address,
        requestFingerprint: fingerprint,
        payment,
        paymentRequiredPayload: payment
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "invalid request" }, 400);
    }

    return next();
  });

  app.use("/risk-report", createX402PaymentMiddleware(config, options));

  app.get("/risk-report", (c) => {
    const rawAddress = c.req.query("address");
    if (!rawAddress) {
      return c.json({ error: "address is required" }, 400);
    }

    try {
      const address = normalizeEvmAddress(rawAddress);
      const payment = paymentRequirementFromConfig(config);
      const fingerprint = requestFingerprint({
        method: "GET",
        path: "/risk-report",
        address,
        payment
      });
      const lifecycle = store.ensureRequiredPayment({
        address,
        requestFingerprint: fingerprint,
        payment,
        paymentRequiredPayload: payment
      });
      const report = generateRiskReport(address);
      return c.json({
        report,
        requestFingerprint: fingerprint,
        orderId: lifecycle.order.id
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "invalid request" }, 400);
    }
  });

  return app;
}
