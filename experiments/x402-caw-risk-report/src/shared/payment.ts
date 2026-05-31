import type { DemoConfig } from "./config.js";
import type { PaymentRequirementSummary } from "./types.js";

export function paymentRequirementFromConfig(config: DemoConfig): PaymentRequirementSummary {
  return {
    scheme: "exact",
    priceUsdc: config.x402PriceUsdc,
    network: config.x402Network,
    tokenSymbol: config.x402TokenSymbol,
    payTo: config.providerPayToAddress,
    resource: "/risk-report"
  };
}
