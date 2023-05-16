# denosearch
denosearch is a wrapper for the MeiliSearch API in Deno. It provides a simple and convenient way to interact with the MeiliSearch API.

> **⚠️ WARNING: This MeiliSearch wrapper is currently under heavy development, and breaking changes may occur frequently. It's currently not recommended to use this in production environments. ⚠️**

## Usage

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
const indexes = await client.indexes();
console.log(indexes);
```

### Get an index

```typescript
const index = await client.index("movies");
console.log(index);
```

### Get index stats

```typescript
const stats = await index.stats();
console.log(stats);
```

### Perform a search

```typescript
const searchOptions = {
  q: "query",
  limit: 10,
  sort: ["rating:desc", "date:desc"]
};
const searchResult = await index.search(searchOptions);
console.log(searchResult);
```

Note: Please replace `"YOUR_API_KEY"` with your actual MeiliSearch API key and `"http://localhost:7700"` with the URL of your MeiliSearch instance.