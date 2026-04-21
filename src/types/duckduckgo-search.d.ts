declare module 'duckduckgo-search' {
  interface TextResult {
    title?: string;
    href?: string;
    body?: string;
  }

  interface SearchOptions {
    max_results?: number;
    region?: string;
    safe_search?: boolean;
    timelimit?: string;
  }

  export function text(query: string, options?: SearchOptions): Promise<TextResult[]>;
}
