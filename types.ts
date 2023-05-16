export type ClientOptions = {
  host: string;
  apiKey?: string;
};

export type ClientHealthResponse = {
  status: string;
};

export type ClientIndexesResponse = {
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
