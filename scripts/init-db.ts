import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "marginal");
  await db.collection("articles").createIndex({ status: 1, savedAt: -1 });
  await db.collection("articles").createIndex({ tags: 1 });
  await db.collection("articles").createIndex(
    { title: "text", content: "text", searchableText: "text" },
    { name: "article_text_search" }
  );
  await db.collection("highlights").createIndex({ articleId: 1 });
  await db.collection("highlights").createIndex({ createdAt: -1 });
  console.log("Indexes created");
  await client.close();
}
main().catch(console.error);
