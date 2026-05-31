import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Database as DatabaseConnection } from "better-sqlite3";
import type { PaymentRequirementSummary } from "../shared/types.js";

export type RiskReportOrderRecord = {
  id: string;
  requestAddress: string;
  resource: "/risk-report";
  requestFingerprint: string;
  price: string;
  network: string;
  token: string;
  payTo: string;
  status: "payment_required" | "paid" | "delivered" | "delivery_failed" | "conflict" | "expired";
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  expiresAt: string;
};

export type PaymentRecord = {
  id: string;
  orderId: string;
  requestFingerprint: string;
  status: "required" | "signature_received" | "verified" | "settled" | "failed";
  price: string;
  network: string;
  token: string;
  payTo: string;
  paymentRequiredPayload: string;
  createdAt: string;
  updatedAt: string;
};

export type RequiredPaymentLifecycle = {
  order: RiskReportOrderRecord;
  payment: PaymentRecord;
};

export type ProviderStore = {
  ensureRequiredPayment(input: {
    address: string;
    requestFingerprint: string;
    payment: PaymentRequirementSummary;
    paymentRequiredPayload: unknown;
    now?: Date;
  }): RequiredPaymentLifecycle;
  getOrderByFingerprint(requestFingerprint: string): RiskReportOrderRecord | undefined;
  getPaymentsForOrder(orderId: string): PaymentRecord[];
  close(): void;
};

export function createSqliteProviderStore(sqlitePath: string): ProviderStore {
  const db = new Database(sqlitePath);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return new SqliteProviderStore(db);
}

class SqliteProviderStore implements ProviderStore {
  constructor(private readonly db: DatabaseConnection) {}

  ensureRequiredPayment(input: {
    address: string;
    requestFingerprint: string;
    payment: PaymentRequirementSummary;
    paymentRequiredPayload: unknown;
    now?: Date;
  }): RequiredPaymentLifecycle {
    const now = input.now ?? new Date();
    const existingOrder = this.getOrderByFingerprint(input.requestFingerprint);
    if (existingOrder) {
      const existingPayment = this.getPaymentsForOrder(existingOrder.id)[0];
      if (existingPayment) {
        return { order: existingOrder, payment: existingPayment };
      }
    }

    const order = existingOrder ?? createOrder(input, now);
    const paymentRecord = createPaymentRecord(order, input.paymentRequiredPayload, now);

    const transaction = this.db.transaction(() => {
      if (!existingOrder) {
        this.db
          .prepare(
            `insert into risk_report_orders (
              id, request_address, resource, request_fingerprint, price, network, token, pay_to,
              status, created_at, paid_at, delivered_at, expires_at
            ) values (
              @id, @requestAddress, @resource, @requestFingerprint, @price, @network, @token, @payTo,
              @status, @createdAt, @paidAt, @deliveredAt, @expiresAt
            )`
          )
          .run(order);
      }

      this.db
        .prepare(
          `insert into payment_records (
            id, order_id, request_fingerprint, status, price, network, token, pay_to,
            payment_required_payload, created_at, updated_at
          ) values (
            @id, @orderId, @requestFingerprint, @status, @price, @network, @token, @payTo,
            @paymentRequiredPayload, @createdAt, @updatedAt
          )`
        )
        .run(paymentRecord);
    });

    transaction();
    return { order, payment: paymentRecord };
  }

  getOrderByFingerprint(requestFingerprint: string): RiskReportOrderRecord | undefined {
    const row = this.db
      .prepare("select * from risk_report_orders where request_fingerprint = ?")
      .get(requestFingerprint) as DbOrderRow | undefined;
    return row ? mapOrder(row) : undefined;
  }

  getPaymentsForOrder(orderId: string): PaymentRecord[] {
    const rows = this.db
      .prepare("select * from payment_records where order_id = ? order by created_at asc")
      .all(orderId) as DbPaymentRow[];
    return rows.map(mapPayment);
  }

  close(): void {
    this.db.close();
  }
}

function migrate(db: DatabaseConnection): void {
  db.exec(`
    create table if not exists risk_report_orders (
      id text primary key,
      request_address text not null,
      resource text not null,
      request_fingerprint text not null unique,
      price text not null,
      network text not null,
      token text not null,
      pay_to text not null,
      status text not null,
      created_at text not null,
      paid_at text,
      delivered_at text,
      expires_at text not null
    );

    create table if not exists payment_records (
      id text primary key,
      order_id text not null references risk_report_orders(id),
      request_fingerprint text not null,
      status text not null,
      price text not null,
      network text not null,
      token text not null,
      pay_to text not null,
      payment_required_payload text not null,
      created_at text not null,
      updated_at text not null
    );
  `);
}

function createOrder(
  input: {
    address: string;
    requestFingerprint: string;
    payment: PaymentRequirementSummary;
  },
  now: Date
): RiskReportOrderRecord {
  return {
    id: `rro_${randomUUID()}`,
    requestAddress: input.address,
    resource: "/risk-report",
    requestFingerprint: input.requestFingerprint,
    price: input.payment.priceUsdc,
    network: input.payment.network,
    token: input.payment.tokenSymbol,
    payTo: input.payment.payTo,
    status: "payment_required",
    createdAt: now.toISOString(),
    paidAt: null,
    deliveredAt: null,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  };
}

function createPaymentRecord(
  order: RiskReportOrderRecord,
  paymentRequiredPayload: unknown,
  now: Date
): PaymentRecord {
  return {
    id: `payrec_${randomUUID()}`,
    orderId: order.id,
    requestFingerprint: order.requestFingerprint,
    status: "required",
    price: order.price,
    network: order.network,
    token: order.token,
    payTo: order.payTo,
    paymentRequiredPayload: JSON.stringify(paymentRequiredPayload),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

type DbOrderRow = {
  id: string;
  request_address: string;
  resource: "/risk-report";
  request_fingerprint: string;
  price: string;
  network: string;
  token: string;
  pay_to: string;
  status: RiskReportOrderRecord["status"];
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  expires_at: string;
};

type DbPaymentRow = {
  id: string;
  order_id: string;
  request_fingerprint: string;
  status: PaymentRecord["status"];
  price: string;
  network: string;
  token: string;
  pay_to: string;
  payment_required_payload: string;
  created_at: string;
  updated_at: string;
};

function mapOrder(row: DbOrderRow): RiskReportOrderRecord {
  return {
    id: row.id,
    requestAddress: row.request_address,
    resource: row.resource,
    requestFingerprint: row.request_fingerprint,
    price: row.price,
    network: row.network,
    token: row.token,
    payTo: row.pay_to,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    deliveredAt: row.delivered_at,
    expiresAt: row.expires_at
  };
}

function mapPayment(row: DbPaymentRow): PaymentRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    requestFingerprint: row.request_fingerprint,
    status: row.status,
    price: row.price,
    network: row.network,
    token: row.token,
    payTo: row.pay_to,
    paymentRequiredPayload: row.payment_required_payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
