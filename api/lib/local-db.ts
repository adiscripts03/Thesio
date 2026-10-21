import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), "intelibot.db");

let _db: DatabaseSync | null = null;

export function getLocalDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    ensureTables(_db);
  }
  return _db;
}

function ensureTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      prompt TEXT,
      mode TEXT,
      methodology_style TEXT,
      latex_template TEXT,
      stage INTEGER DEFAULT 1,
      status TEXT DEFAULT 'running',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      user_id TEXT,
      title TEXT,
      authors TEXT,
      venue TEXT,
      year INTEGER,
      url TEXT,
      doi TEXT,
      abstract TEXT,
      retrieval_method TEXT,
      relevance REAL,
      trust TEXT,
      injection_flag BOOLEAN,
      injection_detail TEXT,
      retrieved_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS passages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      user_id TEXT,
      source_id INTEGER,
      content TEXT,
      locator TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      user_id TEXT,
      kind TEXT,
      title TEXT,
      summary TEXT,
      rationale TEXT,
      feasibility TEXT,
      requires_lab BOOLEAN,
      source_ids TEXT,
      selected BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      user_id TEXT,
      kind TEXT,
      version INTEGER,
      content TEXT,
      meta TEXT,
      status TEXT DEFAULT 'pending',
      review_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS experiment_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      user_id TEXT,
      version INTEGER,
      label TEXT,
      config TEXT,
      metrics TEXT,
      score REAL,
      verdict TEXT,
      architecture_change BOOLEAN,
      parent_version INTEGER,
      logs TEXT,
      rolled_back BOOLEAN DEFAULT 0,
      rollback_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      user_id TEXT,
      stage INTEGER,
      event TEXT,
      actor TEXT,
      severity TEXT,
      detail TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      project_id TEXT,
      title TEXT,
      summary TEXT,
      lesson TEXT,
      weight REAL,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supervisor_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      user_id TEXT,
      from_stage INTEGER,
      to_stage INTEGER,
      decision_type TEXT,
      decision TEXT,
      reason TEXT,
      reasoning TEXT,
      confidence REAL,
      agent_context TEXT,
      approved BOOLEAN,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function parseJsonValue(val: any) {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return val;
      }
    }
  }
  return val;
}

const TEXT_FIELDS = new Set([
  "content", "review_notes", "prompt", "title", "summary", "abstract",
  "event", "lesson", "rationale", "reasoning", "reason", "injection_detail",
  "rollback_reason",
]);

function rowToJson(row: any) {
  if (!row) return row;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "injection_flag" || k === "requires_lab" || k === "selected" || k === "architecture_change" || k === "rolled_back") {
      out[k] = Boolean(v);
    } else if (TEXT_FIELDS.has(k)) {
      out[k] = v;
    } else {
      out[k] = parseJsonValue(v);
    }
  }
  return out;
}

function normalizeParam(val: any): any {
  if (val === true || val === "true") return 1;
  if (val === false || val === "false") return 0;
  return val;
}

export function queryLocalRows(table: string, options: {
  select?: string;
  filters?: Record<string, any>;
  order?: { column: string; ascending: boolean }[];
  limit?: number;
}) {
  const db = getLocalDb();
  let sql = `SELECT * FROM ${table}`;
  const params: any[] = [];
  const whereClauses: string[] = [];

  if (options.filters) {
    for (const [col, rawVal] of Object.entries(options.filters)) {
      if (typeof rawVal === "object" && rawVal !== null && "op" in rawVal) {
        const val = normalizeParam(rawVal.val);
        if (rawVal.op === "eq") {
          whereClauses.push(`${col} = ?`);
          params.push(val);
        } else if (rawVal.op === "neq") {
          whereClauses.push(`${col} != ?`);
          params.push(val);
        } else if (rawVal.op === "gt") {
          whereClauses.push(`${col} > ?`);
          params.push(val);
        } else if (rawVal.op === "lt") {
          whereClauses.push(`${col} < ?`);
          params.push(val);
        }
      } else {
        whereClauses.push(`${col} = ?`);
        params.push(normalizeParam(rawVal));
      }
    }
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(" AND ")}`;
  }

  if (options.order && options.order.length > 0) {
    const orderClauses = options.order.map((o) => `${o.column} ${o.ascending ? "ASC" : "DESC"}`);
    sql += ` ORDER BY ${orderClauses.join(", ")}`;
  }

  if (typeof options.limit === "number") {
    sql += ` LIMIT ${options.limit}`;
  }

  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(rowToJson);
  } catch (err: any) {
    console.error(`[local-db] query error on ${table}:`, err.message);
    return [];
  }
}

export function insertLocalRow(table: string, row: Record<string, any>) {
  const db = getLocalDb();
  const rowCopy = { ...row };

  if (table === "projects" && !rowCopy.id) {
    rowCopy.id = crypto.randomUUID();
  }

  for (const [k, v] of Object.entries(rowCopy)) {
    if (v === undefined) {
      rowCopy[k] = null;
    } else if (typeof v === "object" && v !== null && !(v instanceof Date)) {
      rowCopy[k] = JSON.stringify(v);
    } else if (typeof v === "boolean") {
      rowCopy[k] = v ? 1 : 0;
    }
  }

  const cols = Object.keys(rowCopy);
  const placeholders = cols.map(() => "?").join(", ");
  const values = Object.values(rowCopy);

  const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...values);
    const id = rowCopy.id ?? result.lastInsertRowid;
    return { id, ...row };
  } catch (err: any) {
    console.error(`[local-db] insert error on ${table}:`, err.message);
    throw err;
  }
}

export function updateLocalRows(table: string, updates: Record<string, any>, filters: Record<string, any>) {
  const db = getLocalDb();
  const updatesCopy = { ...updates };

  for (const [k, v] of Object.entries(updatesCopy)) {
    if (v === undefined) {
      updatesCopy[k] = null;
    } else if (typeof v === "object" && v !== null && !(v instanceof Date)) {
      updatesCopy[k] = JSON.stringify(v);
    } else if (typeof v === "boolean") {
      updatesCopy[k] = v ? 1 : 0;
    }
  }

  const setCols = Object.keys(updatesCopy).map((col) => `${col} = ?`);
  const setVals = Object.values(updatesCopy);

  const whereCols: string[] = [];
  const whereVals: any[] = [];
  for (const [col, val] of Object.entries(filters)) {
    whereCols.push(`${col} = ?`);
    whereVals.push(val === undefined ? null : normalizeParam(val));
  }

  let sql = `UPDATE ${table} SET ${setCols.join(", ")}`;
  if (whereCols.length > 0) {
    sql += ` WHERE ${whereCols.join(" AND ")}`;
  }

  try {
    const stmt = db.prepare(sql);
    stmt.run(...setVals, ...whereVals);
  } catch (err: any) {
    console.error(`[local-db] update error on ${table}:`, err.message);
    throw err;
  }
}

export function deleteLocalRows(table: string, filters: Record<string, any>) {
  const db = getLocalDb();
  const whereCols: string[] = [];
  const whereVals: any[] = [];
  for (const [col, val] of Object.entries(filters)) {
    whereCols.push(`${col} = ?`);
    whereVals.push(normalizeParam(val));
  }

  let sql = `DELETE FROM ${table}`;
  if (whereCols.length > 0) {
    sql += ` WHERE ${whereCols.join(" AND ")}`;
  }

  try {
    const stmt = db.prepare(sql);
    stmt.run(...whereVals);
  } catch (err: any) {
    console.error(`[local-db] delete error on ${table}:`, err.message);
    throw err;
  }
}

export function createLocalDbAdapter() {
  return {
    from: (table: string) => {
      const filters: Record<string, any> = {};
      const orderList: { column: string; ascending: boolean }[] = [];
      let limitVal: number | undefined;
      let isSingle = false;
      let isMaybeSingle = false;

      const builder: any = {
        select: (_cols?: string) => builder,
        eq: (col: string, val: any) => {
          filters[col] = { op: "eq", val };
          return builder;
        },
        neq: (col: string, val: any) => {
          filters[col] = { op: "neq", val };
          return builder;
        },
        gt: (col: string, val: any) => {
          filters[col] = { op: "gt", val };
          return builder;
        },
        lt: (col: string, val: any) => {
          filters[col] = { op: "lt", val };
          return builder;
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          orderList.push({ column: col, ascending: opts?.ascending ?? true });
          return builder;
        },
        limit: (n: number) => {
          limitVal = n;
          return builder;
        },
        single: () => {
          isSingle = true;
          return builder;
        },
        maybeSingle: () => {
          isMaybeSingle = true;
          return builder;
        },
        insert: (data: any | any[]) => {
          const items = Array.isArray(data) ? data : [data];
          const inserted: any[] = [];
          for (const item of items) {
            inserted.push(insertLocalRow(table, item));
          }
          const singleObj = { data: inserted[0], error: null };
          const arrayObj = { data: inserted, error: null };
          const defaultObj = Array.isArray(data) ? arrayObj : singleObj;

          const res: any = {
            data: defaultObj.data,
            error: null,
            select: () => res,
            single: () => Promise.resolve(singleObj),
            maybeSingle: () => Promise.resolve(singleObj),
            then: (resolve: any, _reject?: any) => resolve(defaultObj),
          };
          return res;
        },
        update: (data: Record<string, any>) => {
          const updateBuilder: any = {
            eq: (col: string, val: any) => {
              filters[col] = val;
              updateLocalRows(table, data, filters);
              const getUpdated = () => queryLocalRows(table, { filters });
              const res: any = {
                data: null,
                error: null,
                select: (_cols?: string) => {
                  const selectRes: any = {
                    single: () => {
                      const rows = getUpdated();
                      return Promise.resolve({
                        data: rows[0] ?? null,
                        error: rows.length === 0 ? { message: "Row not found" } : null,
                      });
                    },
                    maybeSingle: () => {
                      const rows = getUpdated();
                      return Promise.resolve({ data: rows[0] ?? null, error: null });
                    },
                    then: (resolve: any) => {
                      const rows = getUpdated();
                      resolve({ data: rows, error: null });
                    },
                  };
                  return selectRes;
                },
                single: () => {
                  const rows = getUpdated();
                  return Promise.resolve({
                    data: rows[0] ?? null,
                    error: rows.length === 0 ? { message: "Row not found" } : null,
                  });
                },
                maybeSingle: () => {
                  const rows = getUpdated();
                  return Promise.resolve({ data: rows[0] ?? null, error: null });
                },
                then: (resolve: any, reject: any) => {
                  try {
                    resolve({ data: null, error: null });
                  } catch (e) {
                    reject(e);
                  }
                },
              };
              return res;
            },
            select: (_cols?: string) => {
              try {
                updateLocalRows(table, data, filters);
              } catch {}
              const rows = queryLocalRows(table, { filters });
              return {
                single: () => Promise.resolve({ data: rows[0] ?? null, error: rows.length === 0 ? { message: "Row not found" } : null }),
                maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
                then: (resolve: any) => resolve({ data: rows, error: null }),
              };
            },
            then: (resolve: any, reject: any) => {
              try {
                updateLocalRows(table, data, filters);
                resolve({ data: null, error: null });
              } catch (e) {
                reject(e);
              }
            },
          };
          return updateBuilder;
        },
        delete: () => {
          const deleteBuilder: any = {
            eq: (col: string, val: any) => {
              filters[col] = val;
              deleteLocalRows(table, filters);
              const res: any = {
                data: null,
                error: null,
                select: (_cols?: string) => res,
                single: () => Promise.resolve({ data: null, error: null }),
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
                then: (resolve: any) => resolve({ data: null, error: null }),
              };
              return res;
            },
            then: (resolve: any, reject: any) => {
              try {
                deleteLocalRows(table, filters);
                resolve({ data: null, error: null });
              } catch (e) {
                reject(e);
              }
            },
          };
          return deleteBuilder;
        },
        then: (resolve: any) => {
          const rows = queryLocalRows(table, {
            filters,
            order: orderList,
            limit: limitVal,
          });
          if (isSingle) {
            resolve({
              data: rows[0] ?? null,
              error: rows.length === 0 ? { message: "Row not found" } : null,
            });
          } else if (isMaybeSingle) {
            resolve({ data: rows[0] ?? null, error: null });
          } else {
            resolve({ data: rows, error: null });
          }
        },
      };

      return builder;
    },
  };
}

export function handlePostgRestRequest(
  pathname: string,
  searchParams: URLSearchParams,
  method: string,
  headers: Record<string, string>,
  body: any
) {
  const segments = pathname.split("/").filter(Boolean);
  const table = segments[segments.length - 1];

  if (!table) {
    return { status: 400, body: { error: "Missing table name" } };
  }

  const filters: Record<string, any> = {};
  const orderList: { column: string; ascending: boolean }[] = [];
  let limitVal: number | undefined;

  for (const [key, val] of searchParams.entries()) {
    if (key === "select") continue;
    if (key === "limit") {
      limitVal = parseInt(val, 10);
      continue;
    }
    if (key === "order") {
      const parts = val.split(".");
      if (parts[0]) {
        orderList.push({
          column: parts[0],
          ascending: parts[1] !== "desc",
        });
      }
      continue;
    }
    if (val.startsWith("eq.")) {
      filters[key] = { op: "eq", val: normalizeParam(val.slice(3)) };
    } else if (val.startsWith("neq.")) {
      filters[key] = { op: "neq", val: normalizeParam(val.slice(4)) };
    } else if (val.startsWith("gt.")) {
      filters[key] = { op: "gt", val: normalizeParam(val.slice(3)) };
    } else if (val.startsWith("lt.")) {
      filters[key] = { op: "lt", val: normalizeParam(val.slice(3)) };
    } else {
      filters[key] = { op: "eq", val: normalizeParam(val) };
    }
  }

  const acceptHeader = headers["accept"] || headers["Accept"] || "";
  const wantsSingle = acceptHeader.includes("application/vnd.pgrst.object+json");

  if (method === "GET") {
    const rows = queryLocalRows(table, {
      filters,
      order: orderList,
      limit: limitVal,
    });

    if (wantsSingle) {
      if (!rows.length) {
        return { status: 404, body: { message: "Row not found" } };
      }
      return { status: 200, body: rows[0] };
    }
    return { status: 200, body: rows };
  }

  if (method === "POST") {
    const items = Array.isArray(body) ? body : [body];
    const inserted: any[] = [];
    for (const item of items) {
      inserted.push(insertLocalRow(table, item));
    }
    const returnVal = wantsSingle || !Array.isArray(body) ? inserted[0] : inserted;
    return { status: 201, body: returnVal };
  }

  if (method === "PATCH") {
    const cleanFilters: Record<string, any> = {};
    for (const [k, v] of Object.entries(filters)) {
      cleanFilters[k] = typeof v === "object" && v !== null && "val" in v ? v.val : v;
    }
    updateLocalRows(table, body, cleanFilters);
    return { status: 200, body: { success: true } };
  }

  if (method === "DELETE") {
    const cleanFilters: Record<string, any> = {};
    for (const [k, v] of Object.entries(filters)) {
      cleanFilters[k] = typeof v === "object" && v !== null && "val" in v ? v.val : v;
    }
    deleteLocalRows(table, cleanFilters);
    return { status: 200, body: { success: true } };
  }

  return { status: 405, body: { error: "Method not allowed" } };
}
