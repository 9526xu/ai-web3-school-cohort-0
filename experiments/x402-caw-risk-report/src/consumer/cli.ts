import { loadConfig } from "../shared/config.js";
import { createTaskId } from "../shared/ids.js";
import { reportHash } from "../shared/fingerprint.js";
import { normalizeEvmAddress } from "../shared/address.js";
import { paymentRequirementFromConfig } from "../shared/payment.js";
import type { RiskReport } from "../shared/types.js";
import { buildRiskReportPactSpec } from "./caw.js";
import { precheckPaymentRequirement } from "./precheck.js";
import { validateReport } from "./validate-report.js";
import { writeAuditRecord } from "./audit.js";

type CliArgs = {
  address: string;
  maxPriceUsdc: string;
};

async function main(): Promise<void> {
  const config = loadConfig();
  const args = parseArgs(process.argv.slice(2));
  const address = normalizeEvmAddress(args.address);
  const taskId = createTaskId();
  const requirement = paymentRequirementFromConfig(config);
  const precheck = precheckPaymentRequirement({
    requirement,
    maxPriceUsdc: args.maxPriceUsdc,
    expectedPayTo: config.providerPayToAddress,
    expectedNetwork: config.x402Network,
    expectedTokenSymbol: config.x402TokenSymbol
  });

  const pactSpec = buildRiskReportPactSpec({
    address,
    maxPriceUsdc: args.maxPriceUsdc,
    network: config.x402Network,
    tokenSymbol: config.x402TokenSymbol,
    payTo: config.providerPayToAddress
  });

  const report = await fetchRiskReport(`${config.providerBaseUrl}/risk-report`, address);
  const validation = validateReport(report, address);
  const auditPath = await writeAuditRecord(config.auditDir, {
    taskId,
    requestedAddress: address,
    api: `${config.providerBaseUrl}/risk-report`,
    paymentRequirement: requirement,
    precheck,
    report: {
      hash: reportHash(report),
      riskLevel: report.riskLevel,
      generatedAt: report.generatedAt
    },
    validation
  });

  console.log(
    JSON.stringify(
      {
        taskId,
        address,
        scaffold: true,
        cawPactSpecPrepared: pactSpec.policies.length > 0,
        precheck,
        validation,
        auditPath
      },
      null,
      2
    )
  );
}

async function fetchRiskReport(apiBase: string, address: string): Promise<RiskReport> {
  const response = await fetch(`${apiBase}?address=${encodeURIComponent(address)}`);
  if (!response.ok) {
    throw new Error(`Provider request failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as { report?: RiskReport };
  if (!body.report) {
    throw new Error("Provider response did not include report");
  }
  return body.report;
}

function parseArgs(args: string[]): CliArgs {
  const address = readOption(args, "--address");
  if (!address) {
    throw new Error("Missing required --address");
  }
  return {
    address,
    maxPriceUsdc: readOption(args, "--max-price-usdc") ?? "0.005"
  };
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
