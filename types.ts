export type TaskStatus =
  | "enqueued"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

export type TaskType =
  | "indexCreation"
  | "indexUpdate"
  | "indexDeletion"
  | "indexSwap"
  | "documentAdditionOrUpdate"
  | "documentDeletion"
  | "settingsUpdate"
  | "dumpCreation"
  | "taskCancelation"
  | "taskDeletion"
  | "snapshotCreation";

export type ClientOptions = {
  host: string;
  apiKey?: string;
};

export type HealthResponse = {
  status: string;
};

export type StatsResponse = {
  databaseSize: number;
  lastUpdate: Date;
  indexes: { [key: string]: IndexStats };
};

export type VersionResponse = {
  commitSha: string;
  commitDate: Date;
  pkgVersion: string;
};

export type IndexesOptions = {
  offset?: number;
  limit?: number;
}

export type IndexesResponse = {
  results: Array<Index>;
  offset: number;
  limit: number;
  total: number;
};

export type Index = {
  uid: string;
  createdAt: Date;
  updatedAt: Date;
  primaryKey: string;
};

export type IndexStats = {
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: { [key: string]: number };
};

export type SearchOptions = {
  q?: string;
  offset?: number;
  limit?: number;
  hitsPerPage?: number;
  page?: number;
  filter?: string[];
  facets?: string[];
  attributesToRetrieve?: string[];
  attributesToCrop?: string[];
  cropLength?: number;
  cropMarker?: "…" | string;
  attributesToHighlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  sort?: string[];
  matchingStrategy?: string;
};

export type SearchResult = {
  hits: unknown[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
};

export type DocumentsOptions = {
  offset?: number;
  limit?: number;
  fields?: string[];
};

export type DocumentsResult = {
  results: { [key: string]: unknown };
  offset: number;
  limit: number;
  total: number;
};

export type TaskResponse = {
  taskUid: number;
  indexUid: string;
  status: TaskStatus;
  type: TaskType;
  enqueuedAt: Date;
};

export type TaskError = {
  message: string;
  code: string;
  type: string;
  link: string;
};

export type Task = {
  uid: number;
  indexUid: string;
  status: TaskStatus;
  type: TaskType;
  canceledBy: number | null;
  details: { [key: string]: unknown };
  error: TaskError;
  duration: string;
  enqueuedAt: Date;
};

export type TaskOptions = {
  limit?: number;
  from?: number;
  uids?: "*" | number[];
  statuses?: "*" | string[];
  types?: "*" | string[];
  indexUids?: "*" | (string | number)[];
  canceledBy?: string[];
  beforeEnqueuedAt?: "*" | Date;
  beforeStartedAt?: "*" | Date;
  beforeFinishedAt?: "*" | Date;
  afterEnqueuedAt?: "*" | Date;
  afterStartedAt?: "*" | Date;
  afterFinishedAt?: "*" | Date;
};

export type TasksResult = {
  results: Task[];
  limit: number;
  from: number;
  next: number | null;
};

export type TypoToleranceSettings = {
  enabled: boolean;
  minWordSizeForTypos: { oneTypo: number; twoTypos: number };
  disableOnWords: string[];
  disableOnAttributes: string[];
};

export type SettingsResponse = {
  displayedAttributes: string[];
  searchableAttributes: string[];
  filterableAttributes: string[];
  sortableAttributes: string[];
  rankingRules: string[];
  stopWords: string[];
  synonyms: { [key: string]: unknown };
  distinctAttribute: string;
  typoTolerance: TypoToleranceSettings;
  faceting: { maxValuesPerFacet: number };
  pagination: { maxTotalHits: number };
};

export type IndexFacetingSettings = {
  maxValuesPerFacet: number;
};

export type IndexPaginationSettings = {
  maxTotalHits: number;
};

export type IndexSettings = {
  displayedAttributes?: string[];
  distinctAttribute?: string | null;
  faceting?: IndexFacetingSettings;
  filterableAttributes?: string[];
  pagination?: IndexPaginationSettings;
  rankingRules?: string[];
  searchableAttributes?: string[];
  sortableAttributes?: string[];
  stopWords?: string[];
  synonyms?: { [key: string]: string };
  typoTolerance?: TypoToleranceSettings;
};
