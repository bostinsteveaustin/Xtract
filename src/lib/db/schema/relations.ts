import { relations } from "drizzle-orm";
import { extractions } from "./extractions";
import { sources } from "./sources";
import { ctxFiles } from "./ctx-files";
import { ctxSections } from "./ctx-sections";
import { pipelineRuns } from "./pipeline-runs";
import { domainObjects } from "./domain-objects";
import { objectRelationships } from "./object-relationships";

export const extractionRelations = relations(extractions, ({ many }) => ({
  sources: many(sources),
  pipelineRuns: many(pipelineRuns),
  domainObjects: many(domainObjects),
  objectRelationships: many(objectRelationships),
}));

export const sourceRelations = relations(sources, ({ one }) => ({
  extraction: one(extractions, {
    fields: [sources.extractionId],
    references: [extractions.id],
  }),
}));

export const ctxFileRelations = relations(ctxFiles, ({ one, many }) => ({
  extraction: one(extractions, {
    fields: [ctxFiles.extractionId],
    references: [extractions.id],
  }),
  sections: many(ctxSections),
}));

export const ctxSectionRelations = relations(ctxSections, ({ one }) => ({
  ctxFile: one(ctxFiles, {
    fields: [ctxSections.ctxFileId],
    references: [ctxFiles.id],
  }),
}));

export const pipelineRunRelations = relations(pipelineRuns, ({ one }) => ({
  extraction: one(extractions, {
    fields: [pipelineRuns.extractionId],
    references: [extractions.id],
  }),
}));

export const domainObjectRelations = relations(domainObjects, ({ one }) => ({
  extraction: one(extractions, {
    fields: [domainObjects.extractionId],
    references: [extractions.id],
  }),
  ctxFile: one(ctxFiles, {
    fields: [domainObjects.ctxFileId],
    references: [ctxFiles.id],
  }),
}));

export const objectRelationshipRelations = relations(
  objectRelationships,
  ({ one }) => ({
    extraction: one(extractions, {
      fields: [objectRelationships.extractionId],
      references: [extractions.id],
    }),
  })
);
