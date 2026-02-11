"use client";

import { use } from "react";
import { useCtxFile } from "@/hooks/use-ctx-library";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ObjectAttribute {
  name: string;
  type: string;
  required: boolean;
  description: string;
  enumValues?: string[];
}

interface ObjectTypeSpec {
  typeName: string;
  description: string;
  iCMLPrimaryMapping: string;
  iCMLRelatedMappings?: string[];
  attributes: ObjectAttribute[];
  extractionGuidance: string;
}

export default function CTXDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading } = useCtxFile(id);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">CTX file not found.</p>;
  }

  const { ctxFile, sections } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{ctxFile.name}</h1>
          <Badge
            variant={ctxFile.status === "approved" ? "default" : "secondary"}
          >
            {ctxFile.status}
          </Badge>
        </div>
        {ctxFile.domain && (
          <p className="mt-1 text-sm text-muted-foreground">{ctxFile.domain}</p>
        )}
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>Version {ctxFile.version}</span>
          {ctxFile.xqsKScore != null && (
            <span>XQS-K Score: {ctxFile.xqsKScore}%</span>
          )}
          <span>{sections.length} sections</span>
        </div>
      </div>

      {/* Section Tabs */}
      <Tabs defaultValue={sections[0]?.sectionKey ?? ""}>
        <TabsList>
          {sections.map((s) => (
            <TabsTrigger key={s.sectionKey} value={s.sectionKey}>
              S{s.sectionNumber}: {s.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.sectionKey} value={section.sectionKey}>
            <Card>
              <CardHeader>
                <CardTitle>
                  Section {section.sectionNumber}: {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {section.sectionKey === "objects" ? (
                  <ObjectsSectionView
                    content={section.content as Record<string, unknown>}
                  />
                ) : section.sectionKey === "definitions" ? (
                  <DefinitionsSectionView
                    content={section.content as Record<string, unknown>}
                  />
                ) : section.sectionKey === "assessment_criteria" ? (
                  <RubricsSectionView
                    content={section.content as Record<string, unknown>}
                  />
                ) : (
                  <pre className="max-h-96 overflow-auto rounded bg-muted p-4 text-xs">
                    {JSON.stringify(section.content, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ObjectsSectionView({ content }: { content: Record<string, unknown> }) {
  const objectTypes = (content as { objectTypes?: ObjectTypeSpec[] })
    .objectTypes;
  if (!objectTypes?.length) return <p>No object types defined.</p>;

  return (
    <div className="space-y-6">
      {objectTypes.map((ot) => (
        <div key={ot.typeName} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{ot.typeName}</h3>
            <p className="text-sm text-muted-foreground">{ot.description}</p>
            <div className="mt-1 flex gap-2">
              <Badge variant="outline">
                iCML: {ot.iCMLPrimaryMapping}
              </Badge>
              {ot.iCMLRelatedMappings?.map((m) => (
                <Badge key={m} variant="secondary">
                  {m}
                </Badge>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attribute</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ot.attributes.map((attr) => (
                <TableRow key={attr.name}>
                  <TableCell className="font-mono text-sm">
                    {attr.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{attr.type}</Badge>
                    {attr.enumValues && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({attr.enumValues.length} values)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {attr.required ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground">
                    {attr.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

function DefinitionsSectionView({
  content,
}: {
  content: Record<string, unknown>;
}) {
  const definitions = (
    content as {
      definitions?: Array<{
        term: string;
        inThisContext: string;
        test: string;
        commonMisuse: string;
      }>;
    }
  ).definitions;
  if (!definitions?.length) return <p>No definitions.</p>;

  return (
    <div className="space-y-4">
      {definitions.map((d) => (
        <Card key={d.term}>
          <CardContent className="pt-4">
            <h4 className="font-semibold">{d.term}</h4>
            <p className="mt-1 text-sm">{d.inThisContext}</p>
            <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Test:</span>{" "}
                {d.test}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Common misuse:
                </span>{" "}
                {d.commonMisuse}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RubricsSectionView({
  content,
}: {
  content: Record<string, unknown>;
}) {
  const rubrics = (
    content as {
      rubrics?: Array<{
        name: string;
        appliesTo: string;
        scale: string;
        minimumThreshold: number;
        levels: Array<{
          score: number;
          level: string;
          criteria: string;
        }>;
      }>;
    }
  ).rubrics;
  if (!rubrics?.length) return <p>No rubrics.</p>;

  return (
    <div className="space-y-6">
      {rubrics.map((r) => (
        <div key={r.name} className="space-y-3">
          <div>
            <h4 className="font-semibold">{r.name}</h4>
            <p className="text-sm text-muted-foreground">{r.appliesTo}</p>
            <p className="text-xs text-muted-foreground">
              Scale: {r.scale} | Min threshold: {r.minimumThreshold}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Score</TableHead>
                <TableHead className="w-24">Level</TableHead>
                <TableHead>Criteria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.levels.map((l) => (
                <TableRow key={l.score}>
                  <TableCell className="font-mono">{l.score}</TableCell>
                  <TableCell className="font-medium">{l.level}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.criteria}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
