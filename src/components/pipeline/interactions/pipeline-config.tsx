"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConfigField } from "@/types/pipeline";

interface PipelineConfigProps {
  fields: ConfigField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function PipelineConfig({
  fields,
  values,
  onChange,
}: PipelineConfigProps) {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.key} className="flex items-center gap-4">
          <label className="w-[130px] flex-shrink-0 text-sm font-medium text-right">
            {field.label}
            {field.required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </label>
          <div className="flex-1">
            {field.type === "select" && field.options ? (
              <Select
                value={values[field.key] ?? field.defaultValue ?? ""}
                onValueChange={(v) => onChange(field.key, v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-9"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
