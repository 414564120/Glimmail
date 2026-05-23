import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/glimmail";

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
