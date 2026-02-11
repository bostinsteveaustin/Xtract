import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as relations from "./schema/relations";

// Create a singleton database client
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  schema: { ...schema, ...relations },
});

export type Database = typeof db;
