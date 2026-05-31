export { paymentRequirementFromConfig } from "../shared/payment.js";

export function describeX402Boundary(): string {
  return "x402 seller middleware will be connected in Issue #2; this scaffold does not verify or settle payments.";
}
