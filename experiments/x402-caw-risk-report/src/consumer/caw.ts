export type PactSpecDraft = {
  intent: string;
  execution_plan: string;
  completion_conditions: Array<Record<string, string>>;
  policies: Array<Record<string, unknown>>;
};

export function buildRiskReportPactSpec(input: {
  address: string;
  maxPriceUsdc: string;
  network: string;
  tokenSymbol: string;
  payTo: string;
}): PactSpecDraft {
  return {
    intent: `Buy one on-chain address risk report for ${input.address}.`,
    execution_plan:
      "Request the x402-protected risk report API, validate payment requirements, pay only within policy, retry the API, then validate the report and write an audit record.",
    completion_conditions: [
      { type: "tx_count", threshold: "1" },
      { type: "amount_spent_usd", threshold: "0.02" },
      { type: "time_elapsed", threshold: "1800" }
    ],
    policies: [
      {
        name: "single-risk-report-usdc-transfer",
        type: "transfer",
        rules: {
          effect: "allow",
          when: {
            chain_in: [input.network],
            token_in: [{ chain_id: input.network, token_id: input.tokenSymbol }],
            destination_address_in: [{ chain_id: input.network, address: input.payTo }]
          },
          deny_if: {
            amount_gt: input.maxPriceUsdc
          }
        }
      }
    ]
  };
}
