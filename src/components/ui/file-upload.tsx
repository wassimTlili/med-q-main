"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type Props = {
  label?: string;
  description?: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
};

export function FileUpload({ label, description, accept = ".xlsx", file, onChange, disabled, className }: Props) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (accept && !f.name.toLowerCase().endsWith(accept.replace('.', '').toLowerCase())) return;
    onChange(f);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    onChange(f);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex items-center justify-center rounded-md border border-dashed px-4 py-8 text-center",
          dragOver ? "border-ring bg-muted/40" : "border-muted-foreground/30 bg-muted/20",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onPick}
          disabled={disabled}
        />
        <div className="space-y-1">
          <div className="text-sm">
            Glissez-déposez votre fichier ici ou
            <Button type="button" variant="link" className="px-1" onClick={() => inputRef.current?.click()}>
              cliquez pour choisir
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">Format accepté: {accept}</div>
        </div>
      </div>

      {file && (
        <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
          <div className="truncate">
            <span className="font-medium">{file.name}</span>
            <span className="ml-2 text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>Changer</Button>
            <Button size="sm" variant="destructive" onClick={() => onChange(null)} disabled={disabled}>Retirer</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
