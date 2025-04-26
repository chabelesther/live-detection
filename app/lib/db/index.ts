import { config } from "dotenv";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env.local" });

// Vérifiez que la variable d'environnement est définie
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

// Création du client SQL
const sql = neon(process.env.DATABASE_URL);

// Création du client Drizzle
export const db = drizzle(sql);

// Export pour être utilisé dans les migrations et les scripts
export { sql };
