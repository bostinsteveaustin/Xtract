"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Relationship {
  id: string;
  from_object_icml_id: string;
  to_object_icml_id: string;
  relationship_type: string;
  direction: string;
  confidence: number;
  source: string;
  description?: string | null;
}

interface RelationshipsPreviewProps {
  relationships: Relationship[];
}

export function RelationshipsPreview({
  relationships,
}: RelationshipsPreviewProps) {
  if (relationships.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No relationships found
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-900 hover:bg-gray-900">
            <TableHead className="text-white font-bold text-xs sticky top-0 bg-gray-900 z-10">
              From
            </TableHead>
            <TableHead className="text-white font-bold text-xs sticky top-0 bg-gray-900 z-10">
              To
            </TableHead>
            <TableHead className="text-white font-bold text-xs sticky top-0 bg-gray-900 z-10">
              Type
            </TableHead>
            <TableHead className="text-white font-bold text-xs sticky top-0 bg-gray-900 z-10">
              Dir
            </TableHead>
            <TableHead className="text-white font-bold text-xs sticky top-0 bg-gray-900 z-10">
              Confidence
            </TableHead>
            <TableHead className="text-white font-bold text-xs sticky top-0 bg-gray-900 z-10">
              Description
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {relationships.map((rel) => (
            <TableRow key={rel.id} className="text-xs">
              <TableCell className="font-mono whitespace-nowrap">
                {rel.from_object_icml_id}
              </TableCell>
              <TableCell className="font-mono whitespace-nowrap">
                {rel.to_object_icml_id}
              </TableCell>
              <TableCell className="capitalize">
                {rel.relationship_type.replace(/_/g, " ")}
              </TableCell>
              <TableCell>
                {rel.direction === "bidirectional" ? "↔" : "→"}
              </TableCell>
              <TableCell className="text-center">{rel.confidence}%</TableCell>
              <TableCell className="max-w-[200px] truncate" title={rel.description ?? ""}>
                {rel.description ?? ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
