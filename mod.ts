import {
  ClientOptions,
  DocumentsOptions,
  DocumentsResult,
  HealthResponse,
  Index,
  IndexesResponse,
  IndexSettings,
  IndexStats,
  SearchOptions,
  SearchResult,
  SettingsResponse,
  StatsResponse,
  Task,
  TaskOptions,
  TaskResponse,
  TasksResult,
  VersionResponse,
} from "./types.ts";

export class Client {
  private options: ClientOptions;
  private headers: Headers = new Headers({
    "Content-Type": "application/json",
    "User-Agent": "denosearch",
  });

  constructor(options: ClientOptions) {
    this.options = options;
    if (this.options.apiKey) {
      this.headers.append("Authorization", `Bearer ${this.options.apiKey}`);
    }
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
    if (fetchResult.status == 200 || fetchResult.status == 202) {
      return fetchResult;
    }

    const errorJson = await fetchResult.json();
    throw new Error(JSON.stringify(errorJson, null, 2));
  }

  async health(): Promise<HealthResponse> {
    const healthFetch = await this.raw(`/health`);
    return await healthFetch.json();
  }

  async stats(): Promise<StatsResponse> {
    const statsFetch = await this.raw(`/stats`);
    return await statsFetch.json();
  }

  async version(): Promise<VersionResponse> {
    const versionFetch = await this.raw(`/version`);
    return await versionFetch.json();
  }

  async indexes(): Promise<IndexesResponse> {
    const indexesFetch = await this.raw(`/indexes`);
    return await indexesFetch.json();
  }

  async index(indexName: string): Promise<IndexResponse> {
    const indexFetch = await this.raw(`/indexes/${indexName}`);
    const indexJson = await indexFetch.json();
    return new IndexResponse(this, indexJson);
  }

  async create(indexName: string, primaryKey?: string): Promise<TaskResponse> {
    const indexCreateFetch = await this.raw(
      `/indexes?uid=${indexName}${
        primaryKey ? `&primaryKey=${primaryKey}` : ""
      }`,
      "POST",
    );
    return await indexCreateFetch.json();
  }

  async update(indexName: string, primaryKey: string | null) {
    const indexUpdateFetch = await this.raw(
      `/indexes?uid=${indexName}&primaryKey=${primaryKey}`,
      "PATCH",
    );
    return await indexUpdateFetch.json();
  }

  async delete(indexName: string): Promise<TaskResponse> {
    const indexDeleteFetch = await this.raw(
      `/indexes/${indexName}`,
      "DELETE",
    );
    return await indexDeleteFetch.json();
  }

  async tasks(options?: TaskOptions): Promise<Tasks> {
    let queryParams;
    if (options) {
      queryParams = Object.entries(options)
        .reduce((acc, [key, value]) => {
          const queryEntry = `${key}=${value}`;
          return acc ? `${acc}&${queryEntry}` : queryEntry;
        }, "");
    }
    const tasksFetch = await this.raw(
      `/tasks${queryParams ? `?${queryParams}` : ""}`,
    );
    return new Tasks(this, await tasksFetch.json());
  }

  async task(taskId: number): Promise<Task> {
    const taskFetch = await this.raw(
      `/tasks/${taskId}`,
    );
    return await taskFetch.json();
  }
}

export class IndexResponse {
  #clientInstance: Client;
  uid: string;
  createdAt: Date;
  updatedAt: Date;
  primaryKey: string;
  constructor(clientInstance: Client, indexType: Index) {
    this.#clientInstance = clientInstance;
    this.uid = indexType.uid;
    this.createdAt = indexType.createdAt;
    this.updatedAt = indexType.updatedAt;
    this.primaryKey = indexType.primaryKey;
  }

  async stats(): Promise<IndexStats> {
    const statsFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/stats`,
    );
    return await statsFetch.json();
  }

  async settingsGet(): Promise<SettingsResponse> {
    const settingsFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings`,
    );
    return await settingsFetch.json();
  }

  async settingsUpdate(settings: IndexSettings): Promise<Task> {
    const settingsFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings`,
      "PATCH",
      JSON.stringify(settings),
    );
    return await settingsFetch.json();
  }

  async settingsReset(): Promise<Task> {
    const settingsFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings`,
      "DELETE",
    );
    return await settingsFetch.json();
  }

  async documents(
    options?: DocumentsOptions,
  ): Promise<DocumentsResult> {
    let queryParams;
    if (options) {
      queryParams = Object.entries(options)
        .reduce((acc, [key, value]) => {
          const queryEntry = `${key}=${value}`;
          return acc ? `${acc}&${queryEntry}` : queryEntry;
        }, "");
    }
    const documentsFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents${queryParams ? `?${queryParams}` : ""}`,
    );
    return await documentsFetch.json();
  }

  async document(
    documentId: number | string,
    fields?: string[],
  ): Promise<{ [key: string]: unknown }> {
    const documentFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents/${documentId}${
        fields ? `?fields=${fields.join(",")}` : ""
      }`,
    );
    return await documentFetch.json();
  }

  async addOrReplace(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    primaryKey?: number | string,
  ): Promise<TaskResponse> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    const addOrReplaceFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents${
        primaryKey ? `?primaryKey=${primaryKey}` : ""
      }`,
      "POST",
      JSON.stringify(objectArray ?? []),
    );
    return addOrReplaceFetch.json();
  }

  async addOrUpdate(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    primaryKey?: number | string,
  ): Promise<TaskResponse> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    const addOrReplaceFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents${
        primaryKey ? `?primaryKey=${primaryKey}` : ""
      }`,
      "PUT",
      JSON.stringify(objectArray ?? []),
    );
    return addOrReplaceFetch.json();
  }

  async deleteAll(): Promise<TaskResponse> {
    const deleteAllFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents`,
      "DELETE",
    );
    return await deleteAllFetch.json();
  }

  async delete(documentId: number | string): Promise<TaskResponse> {
    const deleteAllFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents/${documentId}`,
      "DELETE",
    );
    return await deleteAllFetch.json();
  }

  async deleteByBatch(documentIds: (string | number)[]): Promise<TaskResponse> {
    const deleteAllFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents`,
      "DELETE",
      JSON.stringify(documentIds),
    );
    return await deleteAllFetch.json();
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const searchFetch = await this.#clientInstance.raw(
      `/indexes/${this.uid}/search`,
      "POST",
      JSON.stringify(options ?? {}),
    );
    return await searchFetch.json();
  }
}

export class Tasks {
  #clientInstance: Client;
  results: Task[];
  limit: number;
  from: number;
  next: number | null;
  constructor(clientInstance: Client, result: TasksResult) {
    this.#clientInstance = clientInstance;
    this.results = result.results;
    this.limit = result.limit;
    this.from = result.from;
    this.next = result.next;
  }

  async cancel(): Promise<TaskResponse> {
    const tasksToCancel = this.results.reduce((acc, task) => {
      const taskUid = `${task.uid}`;
      return acc ? `${acc},${taskUid}` : taskUid;
    }, "");
    const cancelResult = await this.#clientInstance.raw(
      `/tasks/cancel?uids=${tasksToCancel}`,
      "POST",
    );
    return await cancelResult.json();
  }

  async delete(): Promise<TaskResponse> {
    const tasksToDelete = this.results.reduce((acc, task) => {
      const taskUid = `${task.uid}`;
      return acc ? `${acc},${taskUid}` : taskUid;
    }, "");
    const cancelResult = await this.#clientInstance.raw(
      `/tasks?uids=${tasksToDelete}`,
      "DELETE",
    );
    return await cancelResult.json();
  }
}
