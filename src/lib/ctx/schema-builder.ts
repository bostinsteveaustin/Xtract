// Dynamic Zod schema builder — converts Section 11 ObjectTypeSpec into runtime Zod schemas
// Used by Mode 2 extraction pipeline with Vercel AI SDK's generateObject/streamObject

import { z } from "zod";
import type { ObjectTypeSpec, ObjectAttribute } from "@/types/ctx";

/**
 * Map a single ObjectAttribute to its Zod type
 */
function attributeToZod(attr: ObjectAttribute): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (attr.type) {
    case "text":
      schema = z.string().describe(attr.description);
      break;
    case "entity":
      schema = z
        .string()
        .describe(`${attr.description} (entity name or identifier)`);
      break;
    case "date":
      schema = z
        .string()
        .describe(`${attr.description} (ISO 8601 date format, e.g. 2025-01-15)`);
      break;
    case "enum":
      if (attr.enumValues && attr.enumValues.length >= 2) {
        schema = z
          .enum(attr.enumValues as [string, ...string[]])
          .describe(attr.description);
      } else if (attr.enumValues && attr.enumValues.length === 1) {
        schema = z.literal(attr.enumValues[0]).describe(attr.description);
      } else {
        schema = z.string().describe(attr.description);
      }
      break;
    case "numeric":
      schema = z.number().describe(attr.description);
      break;
    case "boolean":
      schema = z.boolean().describe(attr.description);
      break;
    case "reference":
      schema = z
        .string()
        .describe(`${attr.description} (reference ID to another object)`);
      break;
    case "list":
      schema = z
        .array(z.string())
        .describe(attr.description);
      break;
    default:
      schema = z.string().describe(attr.description);
  }

  // Optional attributes become nullable + optional
  if (!attr.required) {
    schema = schema.optional().nullable();
  }

  return schema;
}

/**
 * Build a Zod schema for a single domain object from a Section 11 ObjectTypeSpec.
 * The resulting schema includes all object attributes plus provenance fields.
 */
export function buildDomainObjectSchema(
  objectSpec: ObjectTypeSpec
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {
    objectID: z
      .string()
      .describe(
        "Unique object identifier in iCML format, e.g. 'icml:OBJ-CT-001'"
      ),
  };

  // Add all attributes from the object spec
  for (const attr of objectSpec.attributes) {
    shape[attr.name] = attributeToZod(attr);
  }

  // Add provenance fields
  shape.sourceClause = z
    .string()
    .describe(
      "The clause or section reference in the source document where this object was found"
    );

  shape.confidence = z
    .enum(["high", "medium", "low"])
    .describe(
      "Confidence level: high = exact text match, medium = inferred from context, low = uncertain interpretation"
    );

  shape.extractionNotes = z
    .string()
    .optional()
    .nullable()
    .describe(
      "Any notes about ambiguity, assumptions made, or alternative interpretations"
    );

  return z.object(shape);
}

/**
 * Build a Zod schema for the entity extraction pass (Pass 2).
 * Extracts parties, document metadata, and the document as an artefact.
 */
export function buildEntityExtractionSchema(): z.ZodType {
  return z.object({
    documentTitle: z
      .string()
      .describe("The title or name of the agreement as stated in the document"),
    documentDate: z
      .string()
      .optional()
      .nullable()
      .describe("The effective date or execution date of the agreement (ISO 8601)"),
    governingLaw: z
      .string()
      .optional()
      .nullable()
      .describe("The governing law jurisdiction if identified"),
    entities: z
      .array(
        z.object({
          name: z
            .string()
            .describe("The name of the entity as it appears in the document"),
          definedTerm: z
            .string()
            .optional()
            .nullable()
            .describe(
              "The defined term used in the contract (e.g., 'the Supplier', 'the Customer')"
            ),
          entityType: z
            .enum(["party", "organization", "individual", "role", "other"])
            .describe("Classification of this entity"),
          roles: z
            .array(z.string())
            .describe(
              "Roles this entity plays in the contract (e.g., 'supplier', 'buyer', 'guarantor')"
            ),
        })
      )
      .describe("All parties and entities identified in the document"),
  });
}

/**
 * Build a Zod schema for the object extraction pass (Pass 3).
 * Wraps the domain object schema in an array for batch extraction per chunk.
 */
export function buildObjectExtractionSchema(
  objectSpec: ObjectTypeSpec
): z.ZodType {
  const objectSchema = buildDomainObjectSchema(objectSpec);

  return z.object({
    objects: z
      .array(objectSchema)
      .describe(
        `Extracted ${objectSpec.typeName} objects from this section of the document. Extract ALL relevant terms — do not skip any substantive clauses.`
      ),
  });
}

/**
 * Build a Zod schema for the relationship resolution pass (Pass 4).
 * Expanded for E-02: 9 relationship types, direction, and confidence scoring.
 */
export function buildRelationshipSchema(): z.ZodType {
  return z.object({
    relationships: z
      .array(
        z.object({
          fromObjectId: z
            .string()
            .describe("objectID of the source object"),
          toObjectId: z
            .string()
            .describe("objectID of the target object"),
          relationshipType: z
            .enum([
              "depends_on",
              "conflicts_with",
              "references",
              "supersedes",
              "superseded_by",
              "related_to",
              "duplicates",
              "categorised_under",
              "implements",
            ])
            .describe("Type of relationship between the objects"),
          direction: z
            .enum(["unidirectional", "bidirectional"])
            .describe(
              "Whether the relationship applies in one direction (A→B) or both (A↔B)"
            ),
          confidence: z
            .number()
            .int()
            .min(0)
            .max(100)
            .describe(
              "Confidence in this relationship: 90-100 = explicit reference, 60-89 = strongly implied, below 60 = inferred"
            ),
          description: z
            .string()
            .describe("Brief explanation of how these objects are related"),
        })
      )
      .describe("Relationships between extracted objects"),
    crossReferences: z
      .array(
        z.object({
          objectId: z.string().describe("objectID of the object"),
          referencedClause: z
            .string()
            .describe("Clause or schedule referenced by this object"),
          resolution: z
            .string()
            .describe(
              "How the cross-reference was resolved (e.g., value found in schedule)"
            ),
        })
      )
      .describe("Cross-references to schedules, appendices, or definitions"),
  });
}

/**
 * Build a Zod schema for the rubric scoring pass (Pass 5).
 */
export function buildScoringSchema(): z.ZodType {
  return z.object({
    scores: z
      .array(
        z.object({
          objectId: z.string().describe("objectID of the scored object"),
          score: z
            .number()
            .int()
            .min(1)
            .max(5)
            .describe("Rubric score (1-5)"),
          level: z
            .string()
            .describe("Rubric level name (e.g., 'Adequate', 'Good', 'Excellent')"),
          rationale: z
            .string()
            .describe(
              "Explanation of why this score was assigned, referencing the rubric criteria"
            ),
        })
      )
      .describe("Rubric scores for each extracted object"),
  });
}
