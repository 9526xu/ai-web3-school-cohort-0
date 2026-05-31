import { createHash } from "node:crypto";
import type { PaymentRequirementSummary, RiskReport } from "./types.js";

export function sha256Json(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function requestFingerprint(input: {
  method: "GET";
  path: "/risk-report";
  address: string;
  payment: PaymentRequirementSummary;
}): string {
  return sha256Json({
    method: input.method,
    path: input.path,
    address: input.address.toLowerCase(),
    priceUsdc: input.payment.priceUsdc,
    network: input.payment.network,
    tokenSymbol: input.payment.tokenSymbol,
    payTo: input.payment.payTo.toLowerCase()
  });
}

export function reportHash(report: RiskReport): string {
  return sha256Json(report);
}
