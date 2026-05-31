import { Hono } from "hono";
import type { DemoConfig } from "../shared/config.js";
import { requestFingerprint } from "../shared/fingerprint.js";
import { generateRiskReport } from "./report.js";
import { normalizeEvmAddress } from "./schema.js";
import { dbPlan } from "./db.js";
import type { ProviderStore, RiskReportOrderRecord } from "./store.js";
import { createSqliteProviderStore } from "./store.js";
import {
  createX402PaymentMiddleware,
  describeX402Boundary,
  paymentIdFromHeader,
  paymentPayloadFromHeader,
  paymentRequirementFromConfig
} from "./x402.js";
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
      const paymentHeader = c.req.header("payment-signature") ?? c.req.header("x-payment");
      const paymentId = paymentIdFromHeader(paymentHeader);
      const existingByPaymentId = paymentId ? store.getOrderByPaymentId(paymentId) : undefined;

      if (paymentId && existingByPaymentId && existingByPaymentId.requestFingerprint !== fingerprint) {
        store.markConflict(paymentId);
        return c.json(
          {
            error: "payment_id_conflict",
            message: "The payment id is already bound to a different request fingerprint."
          },
          409
        );
      }

      if (existingByPaymentId && isExpired(existingByPaymentId)) {
        store.markExpired(existingByPaymentId.id);
        return c.json({ error: "order_expired", message: "The paid delivery cache has expired." }, 410);
      }

      if (existingByPaymentId?.status === "delivered") {
        const delivery = store.getDeliveryForOrder(existingByPaymentId.id);
        if (delivery) {
          c.header("x-risk-report-cache", "hit");
          return c.json(JSON.parse(delivery.responseBody));
        }
      }

      if (existingByPaymentId?.status === "paid") {
        const body = riskReportResponseBody(address, fingerprint, existingByPaymentId);
        store.deliverPaidOrder({
          orderId: existingByPaymentId.id,
          paymentId: paymentId ?? null,
          requestFingerprint: fingerprint,
          responseBody: body
        });
        c.header("x-risk-report-recovery", "paid-order-delivered");
        return c.json(body);
      }

      store.ensureRequiredPayment({
        address,
        requestFingerprint: fingerprint,
        payment,
        paymentRequiredPayload: payment
      });
      if (paymentId) {
        const paymentPayload = paymentPayloadFromHeader(paymentHeader);
        store.bindPaymentId({
          paymentId,
          requestFingerprint: fingerprint,
          paymentSignaturePayload: paymentPayload ?? { malformed: true }
        });
      }
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "invalid request" }, 400);
    }

    return next();
  });

  app.use("/risk-report", createX402PaymentMiddleware(config, store, options));

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
      return c.json(riskReportResponseBody(address, fingerprint, lifecycle.order));
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "invalid request" }, 400);
    }
  });

  return app;
}

function riskReportResponseBody(address: string, requestFingerprint: string, order: RiskReportOrderRecord) {
  return {
    report: generateRiskReport(address),
    requestFingerprint,
    orderId: order.id
  };
}

function isExpired(order: RiskReportOrderRecord, now: Date = new Date()): boolean {
  return Date.parse(order.expiresAt) <= now.getTime();
}
