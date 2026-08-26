import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

class SqliteD1Prepared {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new SqliteD1Prepared(this.database, this.sql, values); }
  async first() {
    const row = this.database.prepare(this.sql).get(...this.values);
    return row ? { ...row } : null;
  }
  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values).map((row) => ({ ...row })) };
  }
  async run() {
    assert.ok(this.values.length <= 100, `D1 permits at most 100 bound parameters per statement; received ${this.values.length}`);
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid ?? 0) } };
  }
}

export class SqliteD1 {
  constructor(database) { this.database = database; }
  prepare(sql) { return new SqliteD1Prepared(this.database, sql); }
  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

export async function applyMigrations(database, directory = 'workers/finance-api/migrations') {
  for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join(directory, file), 'utf8'));
  }
  return database;
}
