import {
  ClientOptions,
  DocumentsOptions,
  DocumentsResult,
  HealthResponse,
  Index,
  IndexesOptions,
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
  TaskStatus,
  TaskType,
  VersionResponse,
} from "./types.ts";

export class Client {
  #isoDateRegex =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/gm;
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
        console.log(newDate, value);
        if (
          this.#isValidDate(newDate) &&
          this.#isoDateRegex.test(value)
        ) {
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

  async indexList(options?: IndexesOptions): Promise<IndexesResponse> {
    let queryParams;
    if (options) {
      queryParams = Object.entries(options)
        .reduce((acc, [key, value]) => {
          const val: unknown = value;
          let queryEntry = `${key}=`;
          if (val instanceof Date) {
            queryEntry += val.toISOString();
          } else if (val instanceof Array) {
            queryEntry += val.join(",");
          } else {
            queryEntry += val;
          }
          return acc ? `${acc}&${queryEntry}` : queryEntry;
        }, "");
    }
    return await this.raw(`/indexes${queryParams ? `?${queryParams}` : ""}`);
  }

  async index(indexName: string): Promise<IndexResponse> {
    return new IndexResponse(this, await this.raw(`/indexes/${indexName}`));
  }

  async indexCreate(
    indexName: string,
    primaryKey?: string,
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this,
      await this.raw(
        `/indexes`,
        "POST",
        JSON.stringify({
          uid: indexName,
          primaryKey,
        }),
      ),
    );
  }

  async indexUpdate(indexName: string, primaryKey: string | null) {
    return await this.raw(
      `/indexes?uid=${indexName}&primaryKey=${primaryKey}`,
      "PATCH",
    );
  }

  async indexDelete(indexName: string): Promise<AwaitableTask> {
    return new AwaitableTask(
      this,
      await this.raw(
        `/indexes/${indexName}`,
        "DELETE",
      ),
    );
  }

  async taskList(options?: TaskOptions): Promise<Tasks> {
    let queryParams;
    if (options) {
      queryParams = Object.entries(options)
        .reduce((acc, [key, value]) => {
          const val: unknown = value;
          let queryEntry = `${key}=`;
          if (val instanceof Date) {
            queryEntry += val.toISOString();
          } else if (val instanceof Array) {
            queryEntry += val.join(",");
          } else {
            queryEntry += val;
          }
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

  async settingsUpdate(settings: IndexSettings): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings`,
        "PATCH",
        JSON.stringify(settings),
      ),
    );
  }

  async settingsReset(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings`,
        "DELETE",
      ),
    );
  }

  async documents(
    options?: DocumentsOptions,
  ): Promise<DocumentsResult> {
    let queryParams;
    if (options) {
      queryParams = Object.entries(options)
        .reduce((acc, [key, value]) => {
          const val: unknown = value;
          let queryEntry = `${key}=`;
          if (val instanceof Date) {
            queryEntry += val.toISOString();
          } else if (val instanceof Array) {
            queryEntry += val.join(",");
          } else {
            queryEntry += val;
          }
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

  async documentsAddOrReplace(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    primaryKey?: number | string,
  ): Promise<AwaitableTask> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/documents${
          primaryKey ? `?primaryKey=${primaryKey}` : ""
        }`,
        "POST",
        JSON.stringify(objectArray ?? []),
      ),
    );
  }

  async documentsAddOrUpdate(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    primaryKey?: number | string,
  ): Promise<AwaitableTask> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/documents${
          primaryKey ? `?primaryKey=${primaryKey}` : ""
        }`,
        "PUT",
        JSON.stringify(objectArray ?? []),
      ),
    );
  }

  async documentsDeleteAll(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/documents`,
        "DELETE",
      ),
    );
  }

  async documentDelete(documentId: number | string): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/documents/${documentId}`,
        "DELETE",
      ),
    );
  }

  async documentDeleteByBatch(
    documentIds: (string | number)[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/documents`,
        "DELETE",
        JSON.stringify(documentIds),
      ),
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

  async cancel(): Promise<AwaitableTask> {
    const tasksToCancel = this.results.reduce((acc, task) => {
      const taskUid = `${task.uid}`;
      return acc ? `${acc},${taskUid}` : taskUid;
    }, "");
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/tasks/cancel?uids=${tasksToCancel}`,
        "POST",
      ),
    );
  }

  async delete(): Promise<AwaitableTask> {
    const tasksToDelete = this.results.reduce((acc, task) => {
      const taskUid = `${task.uid}`;
      return acc ? `${acc},${taskUid}` : taskUid;
    }, "");
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/tasks?uids=${tasksToDelete}`,
        "DELETE",
      ),
    );
  }
}

export class AwaitableTask {
  #clientInstance: Client;
  taskUid: number;
  indexUid: string;
  status: TaskStatus;
  type: TaskType;
  enqueuedAt: Date;

  constructor(clientInstance: Client, taskResponse: TaskResponse) {
    this.#clientInstance = clientInstance;
    this.taskUid = taskResponse.taskUid;
    this.indexUid = taskResponse.indexUid;
    this.status = taskResponse.status;
    this.type = taskResponse.type;
    this.enqueuedAt = taskResponse.enqueuedAt;
  }

  waitUponCompletion(): Promise<Task> {
    return new Promise<Task>((resolve) => {
      const taskNumber = setInterval(
        async () => {
          const checkedTask = await this.#clientInstance.task(
            this.taskUid,
          );
          if (
            checkedTask.status != "enqueued" &&
            checkedTask.status != "processing"
          ) {
            clearInterval(taskNumber);
            resolve(checkedTask);
          }
        },
        1000,
      );
    });
  }
}
