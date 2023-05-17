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
  #iso8061Regex = new RegExp(
    /^(?:\d{4})-(?:\d{2})-(?:\d{2})T(?:\d{2}):(?:\d{2}):(?:\d{2}(?:\.\d*)?)(?:(?:-(?:\d{2}):(?:\d{2})|Z)?)$/g,
  );
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

  #isValidDate(date: Date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  #convertStringToDate(
    obj: { [key: string]: unknown },
  ): { [key: string]: unknown } {
    const entries = Object.entries(obj);
    for (const [key, value] of entries) {
      if (typeof value === "string") {
        const newDate = new Date(value);
        if (this.#isValidDate(newDate)) {
          obj[key] = newDate;
        }
      } else if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            this.#convertStringToDate(value[i] as { [key: string]: unknown });
          }
        } else {
          this.#convertStringToDate(value as { [key: string]: unknown });
        }
      }
    }

    return obj;
  }

  async raw(
    reqStr: string,
    method?: string,
    body?: string,
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
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

    if (!fetchResult.ok) {
      const isJson =
        fetchResult.headers.get("content-type") == "application/json";
      if (!isJson) {
        throw new Error("Could not parse json error");
      }
      const errorJson = await fetchResult.json();
      throw new Error(JSON.stringify(errorJson, null, 2));
    }

    return this.#convertStringToDate(await fetchResult.json());
  }

  async health(): Promise<HealthResponse> {
    return await this.raw(`/health`);
  }

  async stats(): Promise<StatsResponse> {
    return await this.raw(`/stats`);
  }

  async version(): Promise<VersionResponse> {
    return await this.raw(`/version`);
  }

  async indexes(): Promise<IndexesResponse> {
    return await this.raw(`/indexes`);
  }

  async index(indexName: string): Promise<IndexResponse> {
    return new IndexResponse(this, await this.raw(`/indexes/${indexName}`));
  }

  async create(indexName: string, primaryKey?: string): Promise<TaskResponse> {
    return await this.raw(
      `/indexes?uid=${indexName}${
        primaryKey ? `&primaryKey=${primaryKey}` : ""
      }`,
      "POST",
    );
  }

  async update(indexName: string, primaryKey: string | null) {
    return await this.raw(
      `/indexes?uid=${indexName}&primaryKey=${primaryKey}`,
      "PATCH",
    );
  }

  async delete(indexName: string): Promise<TaskResponse> {
    return await this.raw(
      `/indexes/${indexName}`,
      "DELETE",
    );
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
    return new Tasks(
      this,
      await this.raw(
        `/tasks${queryParams ? `?${queryParams}` : ""}`,
      ),
    );
  }

  async task(taskId: number): Promise<Task> {
    return await this.raw(
      `/tasks/${taskId}`,
    );
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
    this.createdAt = new Date(indexType.createdAt);
    this.updatedAt = new Date(indexType.updatedAt);
    this.primaryKey = indexType.primaryKey;
  }

  async stats(): Promise<IndexStats> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/stats`,
    );
  }

  async settingsGet(): Promise<SettingsResponse> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings`,
    );
  }

  async settingsUpdate(settings: IndexSettings): Promise<Task> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings`,
      "PATCH",
      JSON.stringify(settings),
    );
  }

  async settingsReset(): Promise<Task> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings`,
      "DELETE",
    );
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
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents${queryParams ? `?${queryParams}` : ""}`,
    );
  }

  async document(
    documentId: number | string,
    fields?: string[],
  ): Promise<{ [key: string]: unknown }> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents/${documentId}${
        fields ? `?fields=${fields.join(",")}` : ""
      }`,
    );
  }

  async addOrReplace(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    primaryKey?: number | string,
  ): Promise<TaskResponse> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents${
        primaryKey ? `?primaryKey=${primaryKey}` : ""
      }`,
      "POST",
      JSON.stringify(objectArray ?? []),
    );
  }

  async addOrUpdate(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    primaryKey?: number | string,
  ): Promise<TaskResponse> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents${
        primaryKey ? `?primaryKey=${primaryKey}` : ""
      }`,
      "PUT",
      JSON.stringify(objectArray ?? []),
    );
  }

  async deleteAll(): Promise<TaskResponse> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents`,
      "DELETE",
    );
  }

  async delete(documentId: number | string): Promise<TaskResponse> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents/${documentId}`,
      "DELETE",
    );
  }

  async deleteByBatch(documentIds: (string | number)[]): Promise<TaskResponse> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/documents`,
      "DELETE",
      JSON.stringify(documentIds),
    );
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/search`,
      "POST",
      JSON.stringify(options ?? {}),
    );
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
    return await this.#clientInstance.raw(
      `/tasks/cancel?uids=${tasksToCancel}`,
      "POST",
    );
  }

  async delete(): Promise<TaskResponse> {
    const tasksToDelete = this.results.reduce((acc, task) => {
      const taskUid = `${task.uid}`;
      return acc ? `${acc},${taskUid}` : taskUid;
    }, "");
    return await this.#clientInstance.raw(
      `/tasks?uids=${tasksToDelete}`,
      "DELETE",
    );
  }
}
