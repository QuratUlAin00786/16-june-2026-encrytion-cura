import { defineConfig } from "drizzle-kit";
import { getDatabaseConnectionString } from "./server/db-config";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseConnectionString(),
  },
});
