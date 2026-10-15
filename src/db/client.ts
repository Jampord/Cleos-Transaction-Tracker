import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

export const sqlite = openDatabaseSync("cleos.db");
export const db = drizzle(sqlite);
