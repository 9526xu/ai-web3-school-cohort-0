export { paymentRequirementFromConfig } from "../shared/payment.js";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { FacilitatorClient, RoutesConfig } from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import type { MiddlewareHandler } from "hono";
import type { DemoConfig } from "../shared/config.js";
import { paymentRequirementFromConfig } from "../shared/payment.js";

export function describeX402Boundary(): string {
  return "x402 seller middleware quotes unpaid requests; paid verification and settlement are implemented in later slices.";
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
      })
    }
  };
}

export function createX402PaymentMiddleware(
  config: DemoConfig,
  options: { facilitatorClient?: FacilitatorClient; syncFacilitatorOnStart?: boolean } = {}
): MiddlewareHandler {
  const facilitatorClient =
    options.facilitatorClient ??
    new HTTPFacilitatorClient({
      url: config.x402FacilitatorUrl
    });
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    config.x402Network as Network,
    new ExactEvmScheme()
  );

  return paymentMiddleware(
    createRiskReportPaymentRoutes(config),
    resourceServer,
    undefined,
    undefined,
    options.syncFacilitatorOnStart ?? true
  );
}
