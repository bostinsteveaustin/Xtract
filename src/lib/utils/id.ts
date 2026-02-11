import { nanoid } from "nanoid";

/** Generate a 12-character unique ID for database records */
export function generateId(): string {
  return nanoid(12);
}

/** Generate an iCML-style ID with prefix */
export function generateICMLId(prefix: string): string {
  const year = new Date().getFullYear();
  const seq = nanoid(6).toUpperCase();
  return `icml:${prefix}-${year}-${seq}`;
}
