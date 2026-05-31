export { paymentRequirementFromConfig } from "../shared/payment.js";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { FacilitatorClient, RoutesConfig } from "@x402/core/server";
import type { Network, PaymentPayload } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  declarePaymentIdentifierExtension,
  extractPaymentIdentifier,
  paymentIdentifierResourceServerExtension,
  PAYMENT_IDENTIFIER
} from "@x402/extensions/payment-identifier";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import type { MiddlewareHandler } from "hono";
import type { DemoConfig } from "../shared/config.js";
import { paymentRequirementFromConfig } from "../shared/payment.js";
import type { ProviderStore } from "./store.js";

export function describeX402Boundary(): string {
  return "x402 seller middleware quotes unpaid requests, verifies signed payment payloads, settles them, and records paid deliveries server-side.";
}

export function createRiskReportPaymentRoutes(config: DemoConfig): RoutesConfig {
  const payment = paymentRequirementFromConfig(config);
  return {
    "GET /risk-report": {
      accepts: [
        {
          scheme: payment.scheme,
          price: `$${payment.priceUsdc}`,
          network: payment.network as Network,
          payTo: payment.payTo,
          maxTimeoutSeconds: 1800,
          extra: {
            priceUsdc: payment.priceUsdc,
            tokenSymbol: payment.tokenSymbol
          }
        }
      ],
      resource: `${config.providerBaseUrl}/risk-report`,
      description: "On-chain address risk report",
      mimeType: "application/json",
      unpaidResponseBody: () => ({
        contentType: "application/json",
        body: {
          error: "payment_required",
          message: "Payment is required before the risk report can be delivered."
        }
      }),
      extensions: {
        [PAYMENT_IDENTIFIER]: declarePaymentIdentifierExtension(false)
      }
    }
  };
}

export function createX402PaymentMiddleware(
  config: DemoConfig,
  store: ProviderStore,
  options: { facilitatorClient?: FacilitatorClient; syncFacilitatorOnStart?: boolean } = {}
): MiddlewareHandler {
  const facilitatorClient =
    options.facilitatorClient ??
    new HTTPFacilitatorClient({
      url: config.x402FacilitatorUrl
    });
  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(config.x402Network as Network, new ExactEvmScheme())
    .registerExtension(paymentIdentifierResourceServerExtension)
    .onAfterVerify(async (context) => {
      const paymentId = extractPaymentIdentifier(context.paymentPayload as PaymentPayload);
      if (!paymentId) return;

      const order = store.getOrderByPaymentId(paymentId);
      if (!order) return;

      store.recordVerifiedPayment({
        paymentId,
        requestFingerprint: order.requestFingerprint,
        verificationResponse: context.result,
        payer: context.result.payer
      });
    })
    .onAfterSettle(async (context) => {
      const paymentId = extractPaymentIdentifier(context.paymentPayload as PaymentPayload);
      if (!paymentId) return;

      const order = store.getOrderByPaymentId(paymentId);
      if (!order) return;

      const responseBody = responseBodyFromTransportContext(context.transportContext);
      if (!responseBody) return;

      store.recordSettledDelivery({
        paymentId,
        requestFingerprint: order.requestFingerprint,
        settlementResponse: context.result,
        txHash: context.result.transaction,
        payer: context.result.payer,
        responseBody
      });
    });

  return paymentMiddleware(
    createRiskReportPaymentRoutes(config),
    resourceServer,
    undefined,
    undefined,
    options.syncFacilitatorOnStart ?? true
  );
}

export function paymentPayloadFromHeader(header: string | undefined): PaymentPayload | undefined {
  if (!header) return undefined;

  try {
    return JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as PaymentPayload;
  } catch {
    return undefined;
  }
}

export function paymentIdFromHeader(header: string | undefined): string | undefined {
  const payload = paymentPayloadFromHeader(header);
  if (!payload) return undefined;
  return extractPaymentIdentifier(payload) ?? undefined;
}

function responseBodyFromTransportContext(context: unknown): string | undefined {
  if (!context || typeof context !== "object" || !("responseBody" in context)) {
    return undefined;
  }

  const responseBody = (context as { responseBody?: unknown }).responseBody;
  if (Buffer.isBuffer(responseBody)) {
    return responseBody.toString("utf8");
  }
  if (responseBody instanceof Uint8Array) {
    return Buffer.from(responseBody).toString("utf8");
  }
  if (typeof responseBody === "string") {
    return responseBody;
  }
  return undefined;
}
