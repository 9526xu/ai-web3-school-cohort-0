import type { PaymentRequirementSummary, PrecheckResult } from "../shared/types.js";

export function precheckPaymentRequirement(input: {
  requirement: PaymentRequirementSummary;
  maxPriceUsdc: string;
  expectedPayTo: string;
  expectedNetwork: string;
  expectedTokenSymbol: string;
  expectedResource?: "/risk-report";
  now?: Date;
}): PrecheckResult {
  const checks: string[] = [];
  const expectedResource = input.expectedResource ?? "/risk-report";
  const now = input.now ?? new Date();

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

  if (input.requirement.resource !== expectedResource) {
    return { status: "failed", checks, reason: "resource mismatch" };
  }
  checks.push("resource");

  if (input.requirement.expiresAt && Date.parse(input.requirement.expiresAt) <= now.getTime()) {
    return { status: "failed", checks, reason: "payment requirement expired" };
  }
  checks.push("expiry");

  return { status: "passed", checks };
}
