import "../../server-only.ts";
import { initial } from "./0001-initial.ts";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

// All migrations in order. Versions are 1, 2, 3, ... with no gaps. Forward-only:
// add new files at the end; never edit, reorder or remove a merged migration.
// Migration SQL must not manage transactions (the runner owns one transaction)
// and must not use VACUUM, PRAGMA journal_mode or PRAGMA foreign_keys.
export const MIGRATIONS: readonly Migration[] = [initial];
