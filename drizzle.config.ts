import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config({ path: ".env.local" });

// Vérifier que l'URL est définie
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL n'est pas définie dans .env.local");
}

export default {
  schema: "./app/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
} satisfies Config;
