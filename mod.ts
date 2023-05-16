import {
  ClientHealthResponse,
  ClientIndexesResponse,
  ClientOptions,
  Index,
  IndexStats,
  SearchOptions,
  SearchResult,
} from "./types.ts";

export class Client {
  private options: ClientOptions;
  private headers: Headers = new Headers();
  constructor(options: ClientOptions) {
    this.options = options;
    if (this.options.apiKey) {
      this.headers.append("Authorization", `Bearer ${this.options.apiKey}`);
    }
    this.headers.append("Content-Type", "application/json");
  }

  async raw(reqStr: string, method?: string, body?: string): Promise<Response> {
    let fetchResult;
    try {
      fetchResult = await fetch(`${this.options.host}${reqStr}`, {
        headers: this.headers,
        method,
        body,
      });
    } catch (_err) {
      throw new Error("Failed to connect to meilisearch instance");
    }
    if (fetchResult.status != 200) {
      const errorJson = await fetchResult.json();
      throw new Error(JSON.stringify(errorJson, null, 2));
    }
    return fetchResult;
  }

  async health(): Promise<ClientHealthResponse> {
    const healthFetch = await this.raw(`/health`);
    const healthJson = await healthFetch.json();
    return healthJson;
  }

  async listIndexes(): Promise<ClientIndexesResponse> {
    const indexesFetch = await this.raw(`/indexes`);
    const indexesJson = await indexesFetch.json();
    return indexesJson;
  }

  async getIndex(indexName: string): Promise<IndexResponse> {
    const indexFetch = await this.raw(`/indexes/${indexName}`);
    const indexJson = await indexFetch.json();
    return new IndexResponse(this, indexJson);
  }
}

export class IndexResponse {
  clientInstance: Client;
  uid: string;
  createdAt: Date;
  updatedAt: Date;
  primaryKey: string;
  constructor(clientInstance: Client, indexType: Index) {
    this.clientInstance = clientInstance;
    this.uid = indexType.uid;
    this.createdAt = indexType.createdAt;
    this.updatedAt = indexType.updatedAt;
    this.primaryKey = indexType.primaryKey;
  }

  async stats(): Promise<IndexStats> {
    const statsFetch = await this.clientInstance.raw(
      `/indexes/${this.uid}/stats`,
    );
    const statsJson = await statsFetch.json();
    return statsJson;
  }

  async search(searchOptions: SearchOptions): Promise<SearchResult> {
    const searchFetch = await this.clientInstance.raw(
      `/indexes/${this.uid}/search`,
      "POST",
      JSON.stringify(searchOptions),
    );
    const searchJson = await searchFetch.json();
    return searchJson;
  }
}
