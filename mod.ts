import {
  ClientOptions,
  DocumentsOptions,
  DocumentsResult,
  FacetSearchOptions,
  FacetSearchResult,
  HealthResponse,
  Index,
  IndexesOptions,
  IndexesResponse,
  IndexFacetingSettings,
  IndexPaginationSettings,
  IndexSettings,
  IndexSettingsResponse,
  IndexStats,
  IndexTypoToleranceSettings,
  Key,
  KeyCreationOptions,
  KeyOptions,
  KeyResult,
  KeyUpdateOptions,
  MultiSearchResult,
  SearchOptions,
  SearchResult,
  StatsResponse,
  Task,
  TaskOptions,
  TaskResponse,
  TasksResult,
  TaskStatus,
  TaskType,
  VersionResponse,
} from "./types.ts";

const moduleVersion = "1.4.1";

export class Client {
  #isoDateRegex =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/gm;
  private options: ClientOptions;
  private headers: Headers = new Headers({
    "Content-Type": "application/json",
    "User-Agent": `denosearch v${moduleVersion}`,
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
      const hostUrl = `${
        this.options.host.startsWith("http://") ||
          this.options.host.startsWith("https://")
          ? `${this.options.host}`
          : `http://${this.options.host}`
      }`;
      fetchResult = await fetch(`${hostUrl}${reqStr}`, {
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

  async dumpCreate(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this,
      await this.raw(
        `/dumps`,
        "POST",
      ),
    );
  }

  async health(): Promise<HealthResponse> {
    return await this.raw(`/health`);
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

  async key(keyOrUid: string): Promise<Key> {
    return await this.raw(`/keys/${keyOrUid}`);
  }

  async keys(options?: KeyOptions): Promise<KeyResult> {
    return await this.raw(`/keys`, "GET", JSON.stringify(options ?? {}));
  }

  async keyCreate(keyCreationOptions: KeyCreationOptions): Promise<Key> {
    if (keyCreationOptions.expiresAt instanceof Date) {
      keyCreationOptions.expiresAt = keyCreationOptions.expiresAt.toISOString();
    }

    return await this.raw(`/keys`, "POST", JSON.stringify(keyCreationOptions));
  }

  async keyUpdate(
    keyOrUid: string,
    keyUpdateOptions: KeyUpdateOptions,
  ): Promise<Key> {
    return await this.raw(
      `/keys/${keyOrUid}`,
      "PATCH",
      JSON.stringify(keyUpdateOptions),
    );
  }

  async keyDelete(keyOrUid: string): Promise<void> {
    return await this.raw(`/keys/${keyOrUid}`, "DELETE");
  }

  async stats(): Promise<StatsResponse> {
    return await this.raw(`/stats`);
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

  async version(): Promise<VersionResponse> {
    return await this.raw(`/version`);
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

  async settingsGetAll(): Promise<IndexSettingsResponse> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings`,
    );
  }

  async settingsGetDictionary(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/dictionary`,
    );
  }

  async settingsGetDisplayedAttributes(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/displayed-attributes`,
    );
  }

  async settingsGetDistinctAttribute(): Promise<string> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/distinct-attribute`,
    );
  }

  async settingsGetFaceting(): Promise<IndexFacetingSettings> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/faceting`,
    );
  }

  async settingsGetFilterableAttributes(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/filterable-attributes`,
    );
  }

  async settingsGetPagination(): Promise<IndexPaginationSettings> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/pagination`,
    );
  }

  async settingsGetRankingRules(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/ranking-rules`,
    );
  }

  async settingsGetSearchableAttributes(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/searchable-attributes`,
    );
  }

  async settingsGetSeparatorTokens(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/separator-tokens`,
    );
  }

  async settingsGetNonSeparatorTokens(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/non-separator-tokens`,
    );
  }

  async settingsGetSortableAttributes(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/sortable-attributes`,
    );
  }

  async settingsGetStopWords(): Promise<string[]> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/stop-words`,
    );
  }

  async settingsGetSynonyms(): Promise<{ [key: string]: string[] }> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/synonyms`,
    );
  }

  async settingsGetTypoTolerance(): Promise<IndexTypoToleranceSettings> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/settings/typo-tolerance`,
    );
  }

  async settingsUpdateAll(settings: IndexSettings): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings`,
        "PATCH",
        JSON.stringify(settings),
      ),
    );
  }

  async settingsUpdateDictionary(dictionary: string[]): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/dictionary`,
        "PUT",
        JSON.stringify(dictionary),
      ),
    );
  }

  async settingsUpdateDisplayedAttributes(
    displayedAttributes: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/displayed-attributes`,
        "PUT",
        JSON.stringify(displayedAttributes),
      ),
    );
  }

  async settingsUpdateDistinctAttribute(
    distinctAttribute: string,
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/distinct-attribute`,
        "PUT",
        JSON.stringify(distinctAttribute),
      ),
    );
  }

  async settingsUpdateFaceting(
    facetingSettings: IndexFacetingSettings,
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/faceting`,
        "PATCH",
        JSON.stringify(facetingSettings),
      ),
    );
  }

  async settingsUpdateFilterableAttributes(
    filterableAttributes: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/filterable-attributes`,
        "PUT",
        JSON.stringify(filterableAttributes),
      ),
    );
  }

  async settingsUpdatePagination(
    indexSettings: IndexPaginationSettings,
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/pagination`,
        "PATCH",
        JSON.stringify(indexSettings),
      ),
    );
  }

  async settingsUpdateRankingRules(
    rankingRules: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/ranking-rules`,
        "PUT",
        JSON.stringify(rankingRules),
      ),
    );
  }

  async settingsUpdateSearchableAttributes(
    searchableAttributes: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/searchable-attributes`,
        "PUT",
        JSON.stringify(searchableAttributes),
      ),
    );
  }

  async settingsUpdateSeparatorTokens(
    separatorTokens: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/separator-tokens`,
        "PUT",
        JSON.stringify(separatorTokens),
      ),
    );
  }

  async settingsUpdateNonSeparatorTokens(
    nonSeparatorTokens: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/non-separator-tokens`,
        "PUT",
        JSON.stringify(nonSeparatorTokens),
      ),
    );
  }

  async settingsUpdateSortableAttributes(
    sortableAttributes: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/sortable-attributes`,
        "PUT",
        JSON.stringify(sortableAttributes),
      ),
    );
  }

  async settingsUpdateStopWords(
    stopWords: string[],
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/stop-words`,
        "PUT",
        JSON.stringify(stopWords),
      ),
    );
  }

  async settingsUpdateSynonyms(
    synonyms: { [key: string]: string[] },
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/synonyms`,
        "PUT",
        JSON.stringify(synonyms),
      ),
    );
  }

  async settingsUpdateTypoTolerance(
    typoToleranceSettings: IndexTypoToleranceSettings,
  ): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/typo-tolerance`,
        "PUT",
        JSON.stringify(typoToleranceSettings),
      ),
    );
  }

  async settingsResetAll(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings`,
        "DELETE",
      ),
    );
  }

  async settingsResetDictionary(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/dictionary`,
        "DELETE",
      ),
    );
  }

  async settingsResetDisplayedAttributes(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/displayed-attributes`,
        "DELETE",
      ),
    );
  }

  async settingsResetDistinctAttribute(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/distinct-attribute`,
        "DELETE",
      ),
    );
  }

  async settingsResetFaceting(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/faceting`,
        "DELETE",
      ),
    );
  }

  async settingsResetFilterableAttributes(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/filterable-attributes`,
        "DELETE",
      ),
    );
  }

  async settingsResetPagination(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/pagination`,
        "DELETE",
      ),
    );
  }

  async settingsResetRankingRules(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/ranking-rules`,
        "DELETE",
      ),
    );
  }

  async settingsResetSearchableAttributes(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/searchable-attributes`,
        "DELETE",
      ),
    );
  }

  async settingsResetSeparatorTokens(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/separator-tokens`,
        "DELETE",
      ),
    );
  }

  async settingsResetNonSeparatorTokens(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/non-separator-tokens`,
        "DELETE",
      ),
    );
  }

  async settingsResetSortableAttributes(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/sortable-attributes`,
        "DELETE",
      ),
    );
  }

  async settingsResetStopWords(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/stop-words`,
        "DELETE",
      ),
    );
  }

  async settingsResetSynonyms(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/synonyms`,
        "DELETE",
      ),
    );
  }

  async settingsResetTypoTolerance(): Promise<AwaitableTask> {
    return new AwaitableTask(
      this.#clientInstance,
      await this.#clientInstance.raw(
        `/indexes/${this.uid}/settings/typo-tolerance`,
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

  async documentsAddOrReplaceInBatches(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    batchSize = 1000,
    primaryKey?: number | string,
  ): Promise<AwaitableTask[]> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    const awaitableTasks: Array<AwaitableTask> = [];
    for (let i = 0; i < objectArray.length; i += batchSize) {
      awaitableTasks.push(
        new AwaitableTask(
          this.#clientInstance,
          await this.#clientInstance.raw(
            `/indexes/${this.uid}/documents${
              primaryKey ? `?primaryKey=${primaryKey}` : ""
            }`,
            "POST",
            JSON.stringify(objectArray.slice(i, i + batchSize) ?? []),
          ),
        ),
      );
    }
    return awaitableTasks;
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

  async documentsAddOrUpdateInBatches(
    objectOrArray: { [key: string]: unknown } | { [key: string]: unknown }[],
    batchSize = 1000,
    primaryKey?: number | string,
  ): Promise<AwaitableTask[]> {
    const objectArray = Array.isArray(objectOrArray)
      ? objectOrArray
      : [objectOrArray];
    const awaitableTasks: Array<AwaitableTask> = [];
    for (let i = 0; i < objectArray.length; i += batchSize) {
      awaitableTasks.push(
        new AwaitableTask(
          this.#clientInstance,
          await this.#clientInstance.raw(
            `/indexes/${this.uid}/documents${
              primaryKey ? `?primaryKey=${primaryKey}` : ""
            }`,
            "PUT",
            JSON.stringify(objectArray.slice(i, i + batchSize) ?? []),
          ),
        ),
      );
    }
    return awaitableTasks;
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

  async documentsDelete(
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

  async searchMulti(options: SearchOptions[]): Promise<MultiSearchResult> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/multi-search`,
      "POST",
      JSON.stringify({ queries: options } ?? {}),
    );
  }

  async searchFacet(options: FacetSearchOptions): Promise<FacetSearchResult> {
    return await this.#clientInstance.raw(
      `/indexes/${this.uid}/facet-search`,
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
        500,
      );
    });
  }
}
