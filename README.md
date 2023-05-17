# denosearch
denosearch is a wrapper for the MeiliSearch API in Deno. It provides a simple and convenient way to interact with the MeiliSearch API.

> **⚠️ WARNING: This MeiliSearch wrapper is currently under heavy development, and breaking changes may occur frequently. It's currently not recommended to use this in production environments at current state. ⚠️**

## Usage

### Add the module

```typescript
import { Client } from "https://deno.land/x/denosearch/mod.ts"
```

### Create a client

```typescript
const client = new Client({
  host: "http://localhost:7700",
  apiKey: "YOUR_API_KEY",
});
```

### Check health status

```typescript
const health = await client.health();
console.log(health);
```

### List indexes

```typescript
const indexes = await client.indexList();
console.log(indexes);
```

### Get an index

```typescript
const index = await client.index("movies");
console.log(index);
```

### Get index stats

```typescript
const index = await client.index("movies");
const stats = await index.stats();
console.log(stats);
```

### Get documents

```typescript
const index = await client.index("movies");
const documents = await index.documents();
console.log(documents);
```

### Get a specific document

```typescript
const index = await client.index("movies");
const document = await index.document("document_id");
console.log(document);
```

### Add or replace documents

```typescript
const index = await client.index("movies");
const data = { id: 1, title: "Document 1" };
const response = await index.documentsAddOrReplace(data, "id");
console.log(response);
```

### Add or update documents

```typescript
const index = await client.index("movies");
const data = { id: 1, title: "Updated Document 1" };
const response = await index.documentsAddOrUpdate(data, "id");
console.log(response);
```

### Delete all documents

```typescript
const index = await client.index("movies");
const response = await index.documentsDeleteAll();
console.log(response);
```

### Delete a document

```typescript
const index = await client.index("movies");
const response = await index.documentDelete("document_id");
console.log(response);
```

### Delete documents by batch

```typescript
const index = await client.index("movies");
const documentIds = ["id1", "id2", "id3"];
const response = await index.documentsDeleteByBatch(documentIds);
console.log(response);
```

### Perform a search

```typescript
const index = await client.index("movies");
const options = { 
  q: "query", 
  limit: 10, 
  sort: ["rating:desc", "date:desc"] 
};
const result = await index.search(options);
console.log(result);
```

### Get tasks

```typescript
const tasks = await client.taskList();
console.log(tasks);
```

### Get a specific task

```typescript
const task = await client.task(123);
console.log(task);
```

### Cancel tasks

```typescript
const tasks = await client.taskList();
const cancelResponse = await tasks.cancel();
console.log(cancelResponse);
```

### Delete tasks

```typescript
const tasks = await client.taskList();
const deleteResponse = await tasks.delete();
console.log(deleteResponse);
```

### Wait for task completion

```typescript
const index = await meiliClient.indexCreate('movies', 'id');
const task = await meiliClient.taskCheck(index).waitUponCompletion();
console.log(task); //Index was created
```

Note: Please replace `"YOUR_API_KEY"` with your actual MeiliSearch API key and `"http://localhost:7700"` with the URL of your MeiliSearch instance.