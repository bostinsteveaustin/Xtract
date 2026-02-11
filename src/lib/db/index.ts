import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as relations from "./schema/relations";

// Lazy singleton — avoids neon() failing at build time when DATABASE_URL is empty
let _db: NeonHttpDatabase<typeof schema & typeof relations> | null = null;

function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, {
      schema: { ...schema, ...relations },
    });
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema & typeof relations>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = NeonHttpDatabase<typeof schema & typeof relations>;
