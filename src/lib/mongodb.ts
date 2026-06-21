import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB ?? "marginal";

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI!;
  if (process.env.NODE_ENV === "development") {
    const g = global as typeof globalThis & { _mongo?: Promise<MongoClient> };
    if (!g._mongo) g._mongo = new MongoClient(uri).connect();
    return g._mongo;
  }
  return new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
