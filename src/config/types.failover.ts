export type FormatClassFailoverConfig = {
  /** Allow one cross-provider-family retry after provider payload/format rejection. Default: true. */
  crossProvider?: boolean;
};

export type FailoverConfig = {
  /** Format-class fallback controls. */
  formatClass?: FormatClassFailoverConfig;
};
