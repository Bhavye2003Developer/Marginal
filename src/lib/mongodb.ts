import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB ?? "marginal";

let _prod: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI!;
  if (process.env.NODE_ENV === "development") {
    const g = global as typeof globalThis & { _mongo?: Promise<MongoClient> };
    if (!g._mongo) g._mongo = new MongoClient(uri).connect();
    return g._mongo;
  }
  if (!_prod) _prod = new MongoClient(uri).connect();
  return _prod;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
