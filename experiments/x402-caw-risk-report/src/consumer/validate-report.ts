import type { RiskReport } from "../shared/types.js";

const VALID_LEVELS = new Set(["low", "medium", "high", "unknown"]);

export function validateReport(report: RiskReport, requestedAddress: string): {
  status: "passed" | "failed";
  checks: string[];
  reason?: string;
} {
  const checks: string[] = [];

  if (report.address.toLowerCase() !== requestedAddress.toLowerCase()) {
    return { status: "failed", checks, reason: "address mismatch" };
  }
  checks.push("address_match");

  if (!Number.isInteger(report.riskScore) || !report.generatedAt || !Array.isArray(report.labels)) {
    return { status: "failed", checks, reason: "required fields missing" };
  }
  checks.push("required_fields");

  if (!VALID_LEVELS.has(report.riskLevel)) {
    return { status: "failed", checks, reason: "invalid risk level" };
  }
  checks.push("risk_level");

  return { status: "passed", checks };
}
