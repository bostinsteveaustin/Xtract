import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { generateId } from "@/lib/utils/id";
import { extractions } from "./extractions";

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "supersedes",
  "superseded_by",
  "related_to",
  "duplicates",
  "categorised_under",
  "implements",
  "depends_on",
  "conflicts_with",
  "references",
]);

export const relationshipDirectionEnum = pgEnum("relationship_direction", [
  "unidirectional",
  "bidirectional",
]);

export const relationshipSourceEnum = pgEnum("relationship_source", [
  "extraction",
  "analysis_pass",
  "human_review",
]);

export const objectRelationships = pgTable("object_relationships", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  extractionId: text("extraction_id")
    .references(() => extractions.id, { onDelete: "cascade" })
    .notNull(),
  /** iCML ID of the source object (e.g. "icml:OBJ-CT-001") */
  fromObjectIcmlId: text("from_object_icml_id").notNull(),
  /** iCML ID of the target object (e.g. "icml:OBJ-CT-005") */
  toObjectIcmlId: text("to_object_icml_id").notNull(),
  /** Relationship type */
  relationshipType: relationshipTypeEnum("relationship_type").notNull(),
  /** Direction: unidirectional (A→B) or bidirectional (A↔B) */
  direction: relationshipDirectionEnum("direction")
    .notNull()
    .default("unidirectional"),
  /** Confidence score 0-100 */
  confidence: integer("confidence").notNull().default(70),
  /** Where this relationship was identified */
  source: relationshipSourceEnum("source").notNull().default("extraction"),
  /** Human-readable description of the relationship */
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ObjectRelationshipRecord =
  typeof objectRelationships.$inferSelect;
export type NewObjectRelationship = typeof objectRelationships.$inferInsert;
