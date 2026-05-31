# Payment / Commerce / Settlement 任务笔记

## 任务

- 来源：AI x Web3 School，模块 B：Payment / Commerce / Settlement
- 截止时间：
- 相关 Handbook 页面：
- 主设计文档：[x402 Paywall + CAW Agent 链上地址风险报告 PRD](../hackathon/x402-caw-risk-report-prd.md)

## 目标

设计一个 MVP 版 agent commerce flow：Agent 帮用户通过 x402 保护的 API 购买一份链上地址风险报告，同时由 Cobo CAW / Pact 限制预算、操作范围、收款方、token、network 和时间窗口。

本任务要理解的重点是：agent commerce 不是简单的自动付款，而是需要明确授权、预算控制、交付验收、失败处理、收据和可审计记录。

## 场景

用户请求：

```text
帮我查询 0xabc... 是否是高风险地址，单次预算不要超过 0.005 USDC。
```

Agent 调用一个付费风险报告 API。API 返回 x402 付款要求。Agent 判断该付款要求是否符合用户已批准的 CAW Pact。如果符合，Agent 完成付款、获取报告、验收结果，并把报告和收据一起返回给用户。

## 角色拆解

| 问题 | MVP 回答 |
| --- | --- |
| 谁下单？ | 用户。 |
| 谁执行？ | 接入 CAW 的 Agent。 |
| 谁提供服务？ | 风险报告 API 服务方。 |
| 谁验收？ | Agent 验收结构化字段；异常情况交给用户。 |
| 谁付款？ | 用户的 CAW 钱包，通过 scoped Pact 付款。 |
| 谁仲裁？ | MVP 不设置正式仲裁方；失败进入拒绝、重试限制、退款请求或人工复核。 |

## 最小 Payment / Commerce Flow

1. 用户提供目标地址和预算上限。
2. Agent 提交 CAW Pact 请求，包含 intent、execution plan、spend limit、payee allowlist、allowed token、network 和 expiry。
3. 用户批准 Pact。
4. Agent 调用 `GET /risk-report?address=0xabc...`。
5. API 返回 `402 Payment Required` 和 x402 付款详情。
6. Agent 根据已批准 policy 校验 price、payee、token、network、resource 和 expiry。
7. 如果付款要求超出 policy，Agent 拒绝付款并解释原因。
8. 如果付款要求符合 policy，Agent 通过 CAW 提交付款操作。
9. CAW 作为最终授权边界强制执行 Pact。
10. x402 settlement 完成。
11. Agent 携带付款证明重试 API 请求。
12. API 返回风险报告和 payment response。
13. Agent 验收报告。
14. Agent 向用户返回结果、收据和审计摘要。

## 报价、执行、验收、付款、失败处理、记录证明

| 阶段 | MVP 设计 |
| --- | --- |
| 报价 | x402 `402 Payment Required` 返回 amount、token、network、payee 和 resource。 |
| 执行 | Agent 在允许范围内付款后，重试受保护 API。 |
| 验收 | Agent 检查地址一致性、必要字段、报告新鲜度、风险等级和收据。 |
| 付款 | CAW 只在已批准 Pact 范围内提交付款；x402 处理 settlement。 |
| 失败处理 | 拒绝超预算、错误收款方、错误 network、错误 token、过期 Pact、格式错误报告或重复 402 循环。 |
| 记录证明 | 记录用户请求、Pact ID、付款要求、settlement response 或交易 hash、报告 hash、验收结果和失败原因。 |

## 重要设计说明

CAW Pact 是最终强制执行边界。它会拒绝超出已批准 delegation 的操作。

Agent 前置校验仍然需要存在。它是支付决策和解释边界。Agent 不应该把所有 x402 付款要求都盲目提交给 CAW，而应该先判断该要求是否符合用户任务和 policy。

## 协议比较

| 协议 | 解决什么 | 在本任务中的位置 |
| --- | --- | --- |
| x402 | 面向付费 API、tool 或 content 的 HTTP 请求级支付。 | MVP 主协议，因为产品是一份付费 API 响应。 |
| ERC-8183 | 带 escrow、provider submission、evaluator、completion、rejection 和 payment release 的任务级 commerce。 | 未来方向，适合交付物更主观或需要仲裁的复杂任务。 |

ERC-8004 后续可以补充 agent 身份、发现、声誉和验证。它不是 payment layer。

## 结果

已设计一个围绕链上地址风险报告 API 的 x402 Paywall + CAW Agent 自主支付 MVP flow。

## 证据

- Repo/commit:
- Demo:
- Submission link:

## 复盘

- 有效之处：场景足够小，适合 x402；同时能暴露完整 commerce 链路，包括授权、报价、付款、交付、验收和审计。
- 难点：要区分 payment settlement 和 service quality validation。链上记录能证明付款，但不能证明报告有用或有效。
- 后续改进：未来版本可以引入 ERC-8183 风格的 escrow 和 evaluator，用于处理主观交付物。
