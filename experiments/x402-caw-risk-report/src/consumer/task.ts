import { normalizeEvmAddress } from "../shared/address.js";
import { loadConfig, type DemoConfig } from "../shared/config.js";
import { createTaskId } from "../shared/ids.js";
import type { AuditRecord, PrecheckResult } from "../shared/types.js";
import { precheckPaymentRequirement } from "./precheck.js";
import { writeAuditRecord } from "./audit.js";
import { parsePaymentRequiredResponse, summarizePaymentRequirement } from "./x402-requirement.js";

export type ConsumerTaskArgs = {
  address: string;
  apiUrl?: string;
  maxPriceUsdc: string;
  expectedPayTo: string;
  expectedNetwork: string;
  expectedTokenSymbol: string;
  expectedResource: "/risk-report";
};

export type ConsumerTaskResult = {
  taskId: string;
  address: string;
  precheck: PrecheckResult;
  auditPath: string;
  paymentAttempted: false;
};

export async function runConsumerPrecheckTask(
  args: ConsumerTaskArgs,
  options: {
    config?: DemoConfig;
    fetchFn?: typeof fetch;
    now?: Date;
  } = {}
): Promise<ConsumerTaskResult> {
  const config = options.config ?? loadConfig();
  const fetchFn = options.fetchFn ?? fetch;
  const address = normalizeEvmAddress(args.address);
  const apiUrl = args.apiUrl ?? `${config.providerBaseUrl}/risk-report`;
  const taskId = createTaskId(options.now);
  const response = await fetchFn(`${apiUrl}?address=${encodeURIComponent(address)}`, {
    headers: { accept: "application/json" }
  });

  if (response.status !== 402) {
    throw new Error(`Expected 402 Payment Required, got ${response.status}`);
  }

  const paymentRequired = parsePaymentRequiredResponse(response);
  const requirement = summarizePaymentRequirement(paymentRequired);
  const precheck = precheckPaymentRequirement({
    requirement,
    maxPriceUsdc: args.maxPriceUsdc,
    expectedPayTo: args.expectedPayTo,
    expectedNetwork: args.expectedNetwork,
    expectedTokenSymbol: args.expectedTokenSymbol,
    expectedResource: args.expectedResource,
    now: options.now
  });

  const audit: AuditRecord = {
    taskId,
    requestedAddress: address,
    api: apiUrl,
    paymentRequirement: requirement,
    precheck,
    payment: {
      status: "not_attempted",
      reason:
        precheck.status === "failed"
          ? `Local precheck refused payment: ${precheck.reason}`
          : "Issue #5 stops after local precheck; CAW payment is implemented later."
    }
  };
  const auditPath = await writeAuditRecord(config.auditDir, audit);

  return {
    taskId,
    address,
    precheck,
    auditPath,
    paymentAttempted: false
  };
}
