export type ImportSource =
  | "weibo" | "qqzone" | "wechat" | "yiyan" | "word" | "txt" | "markdown" | "pdf" | "csv" | "other";

export type ImportMode = "browser" | "root" | "accessibility" | "ocr" | "file";

export type ImportCandidate = {
  id: string;
  source: ImportSource;
  sourceLabel: string;
  publishedAt?: string;
  title: string;
  text: string;
  images: string[];
  originalUrl?: string;
  selected: boolean;
  raw?: unknown;
  warnings?: string[];
};

export type ImportContext = {
  files?: File[];
  mode: ImportMode;
};

export interface ImportAdapter {
  readonly id: ImportSource;
  readonly label: string;
  readonly modes: readonly ImportMode[];
  readonly description: string;
  isAvailable(mode: ImportMode): Promise<boolean>;
  collect(context: ImportContext): Promise<ImportCandidate[]>;
}

export function candidate(
  source: ImportSource,
  sourceLabel: string,
  title: string,
  text: string,
  extra: Partial<ImportCandidate> = {},
): ImportCandidate {
  return {
    id: crypto.randomUUID(),
    source,
    sourceLabel,
    title,
    text,
    images: [],
    selected: true,
    ...extra,
  };
}
