export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type RiskReport = {
  address: string;
  riskScore: number;
  riskLevel: RiskLevel;
  labels: string[];
  generatedAt: string;
  method: "deterministic-mock-v1";
};

export type PaymentRequirementSummary = {
  scheme: "exact";
  priceUsdc: string;
  network: string;
  tokenSymbol: string;
  payTo: string;
  resource: "/risk-report";
  expiresAt?: string;
};

export type PrecheckResult =
  | { status: "passed"; checks: string[] }
  | { status: "failed"; checks: string[]; reason: string };

export type AuditRecord = {
  taskId: string;
  requestedAddress: string;
  api: string;
  paymentRequirement?: PaymentRequirementSummary;
  precheck?: PrecheckResult;
  payment?: {
    status: "not_attempted";
    reason: string;
  };
  report?: {
    hash: string;
    riskLevel: RiskLevel;
    generatedAt: string;
  };
  validation?: {
    status: "passed" | "failed";
    checks: string[];
    reason?: string;
  };
};
