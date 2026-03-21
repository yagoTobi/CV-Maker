import type { useFormBuilder } from "../../hooks/useFormBuilder";

export type FB = ReturnType<typeof useFormBuilder>;

export interface ImportCtx {
  getConfidence: (path: string) => 'low' | 'medium' | undefined;
  markReviewed: (path: string) => void;
}
