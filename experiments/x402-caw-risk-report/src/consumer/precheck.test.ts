import { describe, expect, it } from "vitest";
import { precheckPaymentRequirement } from "./precheck.js";

const baseRequirement = {
  scheme: "exact" as const,
  priceUsdc: "0.005",
  network: "eip155:84532",
  tokenSymbol: "USDC",
  payTo: "0x0000000000000000000000000000000000000000",
  resource: "/risk-report" as const
};

describe("precheckPaymentRequirement", () => {
  it("passes when the payment requirement matches local policy", () => {
    expect(
      precheckPaymentRequirement({
        requirement: baseRequirement,
        maxPriceUsdc: "0.005",
        expectedPayTo: baseRequirement.payTo,
        expectedNetwork: baseRequirement.network,
        expectedTokenSymbol: baseRequirement.tokenSymbol
      })
    ).toEqual({
      status: "passed",
      checks: ["price", "payee", "network", "token", "resource"]
    });
  });

  it("fails before payment when the quote exceeds budget", () => {
    expect(
      precheckPaymentRequirement({
        requirement: { ...baseRequirement, priceUsdc: "0.006" },
        maxPriceUsdc: "0.005",
        expectedPayTo: baseRequirement.payTo,
        expectedNetwork: baseRequirement.network,
        expectedTokenSymbol: baseRequirement.tokenSymbol
      })
    ).toEqual({
      status: "failed",
      checks: [],
      reason: "payment requirement exceeds max price"
    });
  });
});
