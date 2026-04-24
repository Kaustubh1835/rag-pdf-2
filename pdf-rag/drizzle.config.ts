import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local (drizzle-kit doesn't read it by default)
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
