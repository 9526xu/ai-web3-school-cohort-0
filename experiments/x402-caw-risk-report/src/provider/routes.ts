import { Hono } from "hono";
import type { DemoConfig } from "../shared/config.js";
import { requestFingerprint } from "../shared/fingerprint.js";
import { generateRiskReport } from "./report.js";
import { normalizeEvmAddress } from "./schema.js";
import { dbPlan } from "./db.js";
import { describeX402Boundary, paymentRequirementFromConfig } from "./x402.js";

export function createProviderApp(config: DemoConfig): Hono {
  const app = new Hono();

  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      stack: "typescript+hono+node",
      db: dbPlan(config),
      x402: describeX402Boundary()
    });
  });

  app.get("/risk-report", (c) => {
    const rawAddress = c.req.query("address");
    if (!rawAddress) {
      return c.json({ error: "address is required" }, 400);
    }

    try {
      const address = normalizeEvmAddress(rawAddress);
      const payment = paymentRequirementFromConfig(config);
      const report = generateRiskReport(address);
      return c.json({
        report,
        requestFingerprint: requestFingerprint({
          method: "GET",
          path: "/risk-report",
          address,
          payment
        })
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "invalid request" }, 400);
    }
  });

  return app;
}
