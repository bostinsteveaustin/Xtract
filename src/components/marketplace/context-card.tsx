"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ContextCardProps {
  id: string;
  title: string;
  description: string;
  contextType: string;
  onClick: () => void;
}

const TYPE_COLOURS: Record<string, string> = {
  method: "bg-blue-100 text-blue-800",
  skill: "bg-purple-100 text-purple-800",
  policy: "bg-amber-100 text-amber-800",
  reference: "bg-green-100 text-green-800",
  package: "bg-pink-100 text-pink-800",
};

export function ContextCard({
  title,
  description,
  contextType,
  onClick,
}: ContextCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
            {title}
          </CardTitle>
          <Badge
            variant="secondary"
            className={`capitalize flex-shrink-0 text-xs ${
              TYPE_COLOURS[contextType] ?? ""
            }`}
          >
            {contextType}
          </Badge>
        </div>
        <CardDescription className="text-xs line-clamp-3 mt-1">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
