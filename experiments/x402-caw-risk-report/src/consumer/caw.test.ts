import { describe, expect, it } from "vitest";
import { buildRiskReportPactSpec } from "./caw.js";

describe("buildRiskReportPactSpec", () => {
  it("maps Solana Devnet x402 requirements to CAW Solana token ids", () => {
    const spec = buildRiskReportPactSpec({
      address: "0x0000000000000000000000000000000000000001",
      maxPriceUsdc: "0.005",
      network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      tokenSymbol: "USDC",
      payTo: "7kuW3nm9Yw7c3SAQEZpBsyVgNywpabJekeXjKuYt2Z4b"
    });

    expect(spec.policies[0]).toMatchObject({
      rules: {
        when: {
          chain_in: ["SOLDEV_SOL"],
          token_in: [{ chain_id: "SOLDEV_SOL", token_id: "SOLDEV_SOL_USDC" }],
          destination_address_in: [
            {
              chain_id: "SOLDEV_SOL",
              address: "7kuW3nm9Yw7c3SAQEZpBsyVgNywpabJekeXjKuYt2Z4b"
            }
          ]
        }
      }
    });
  });

  it("maps Base Sepolia x402 requirements to CAW Base Sepolia token ids", () => {
    const spec = buildRiskReportPactSpec({
      address: "0x0000000000000000000000000000000000000001",
      maxPriceUsdc: "0.005",
      network: "eip155:84532",
      tokenSymbol: "USDC",
      payTo: "0xDbAb90d3A468E25ed69F54D0850d492F3C6649BD"
    });

    expect(spec.policies[0]).toMatchObject({
      rules: {
        when: {
          chain_in: ["TBASE_SETH"],
          token_in: [{ chain_id: "TBASE_SETH", token_id: "TBASE_SETH_USDC" }],
          destination_address_in: [
            {
              chain_id: "TBASE_SETH",
              address: "0xDbAb90d3A468E25ed69F54D0850d492F3C6649BD"
            }
          ]
        }
      }
    });
  });
});
