import path from "node:path";

export type DemoConfig = {
  port: number;
  providerBaseUrl: string;
  providerPayToAddress: string;
  x402Network: string;
  x402PriceUsdc: string;
  x402TokenSymbol: string;
  x402FacilitatorUrl: string;
  cawApiBaseUrl: string;
  cawWalletId: string;
  cawAgentCredential: string;
  sqlitePath: string;
  auditDir: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): DemoConfig {
  return {
    port: parsePort(env.PORT),
    providerBaseUrl: env.PROVIDER_BASE_URL ?? "http://localhost:4021",
    providerPayToAddress: env.PROVIDER_PAY_TO_ADDRESS ?? "0x0000000000000000000000000000000000000000",
    x402Network: env.X402_NETWORK ?? "eip155:84532",
    x402PriceUsdc: env.X402_PRICE_USDC ?? "0.005",
    x402TokenSymbol: env.X402_TOKEN_SYMBOL ?? "USDC",
    x402FacilitatorUrl: env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator",
    cawApiBaseUrl: env.CAW_API_BASE_URL ?? "https://api.example.invalid",
    cawWalletId: env.CAW_WALLET_ID ?? "replace-with-wallet-id",
    cawAgentCredential: env.CAW_AGENT_CREDENTIAL ?? "replace-with-agent-credential",
    sqlitePath: path.resolve(env.SQLITE_PATH ?? "./data/risk-report-demo.sqlite"),
    auditDir: path.resolve(env.AUDIT_DIR ?? "./audits")
  };
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "4021");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return port;
}
