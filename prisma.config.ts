import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "prisma/config";

function readLocalDatabaseUrl() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) return undefined;

  const match = readFileSync(envPath, "utf8").match(
    /^DATABASE_URL=(?:"([^"]+)"|(.+))$/m,
  );

  return match?.[1] || match?.[2]?.trim();
}

const databaseUrl =
  process.env.DATABASE_URL ||
  readLocalDatabaseUrl() ||
  "postgresql://postgres:postgres@localhost:5432/glimmail";

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
