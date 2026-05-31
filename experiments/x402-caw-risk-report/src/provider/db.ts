import type { DemoConfig } from "../shared/config.js";

export type DbPlan = {
  sqlitePath: string;
  status: "planned";
};

export function dbPlan(config: DemoConfig): DbPlan {
  return {
    sqlitePath: config.sqlitePath,
    status: "planned"
  };
}
