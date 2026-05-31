import type { PaymentRequirementSummary, PrecheckResult } from "../shared/types.js";

export function precheckPaymentRequirement(input: {
  requirement: PaymentRequirementSummary;
  maxPriceUsdc: string;
  expectedPayTo: string;
  expectedNetwork: string;
  expectedTokenSymbol: string;
}): PrecheckResult {
  const checks: string[] = [];

  if (Number(input.requirement.priceUsdc) > Number(input.maxPriceUsdc)) {
    return { status: "failed", checks, reason: "payment requirement exceeds max price" };
  }
  checks.push("price");

  if (input.requirement.payTo.toLowerCase() !== input.expectedPayTo.toLowerCase()) {
    return { status: "failed", checks, reason: "payee mismatch" };
  }
  checks.push("payee");

  if (input.requirement.network !== input.expectedNetwork) {
    return { status: "failed", checks, reason: "network mismatch" };
  }
  checks.push("network");

  if (input.requirement.tokenSymbol !== input.expectedTokenSymbol) {
    return { status: "failed", checks, reason: "token mismatch" };
  }
  checks.push("token");

  if (input.requirement.resource !== "/risk-report") {
    return { status: "failed", checks, reason: "resource mismatch" };
  }
  checks.push("resource");

  return { status: "passed", checks };
}
