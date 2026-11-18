/**
 * Minimal chainable Supabase stand-in for route tests. Every query is logged
 * and answered by a test-supplied `resolve(op)` function, so tests can assert
 * both what a route *wrote* and in what order.
 */
export interface FakeOp {
  table: string;
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' | 'rpc';
  filters: [string, unknown][];
  payload?: unknown;
  mode: 'many' | 'single' | 'maybeSingle';
}

export interface FakeResult {
  data: unknown;
  error: { code?: string; message: string } | null;
  count?: number;
}

export type Resolver = (op: FakeOp) => FakeResult | undefined;

class Query implements PromiseLike<FakeResult> {
  private action: FakeOp['action'] = 'select';
  private filters: [string, unknown][] = [];
  private payload: unknown;
  private mode: FakeOp['mode'] = 'many';

  constructor(
    private table: string,
    private resolve: Resolver,
    private log: FakeOp[]
  ) {}

  select() {
    return this;
  }
  insert(payload: unknown) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: unknown) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }
  upsert(payload: unknown) {
    this.action = 'upsert';
    this.payload = payload;
    return this;
  }
  delete() {
    this.action = 'delete';
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  neq() {
    return this;
  }
  in() {
    return this;
  }
  gte() {
    return this;
  }
  not() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  single() {
    this.mode = 'single';
    return this.run();
  }
  maybeSingle() {
    this.mode = 'maybeSingle';
    return this.run();
  }

  private run(): Promise<FakeResult> {
    const op: FakeOp = {
      table: this.table,
      action: this.action,
      filters: this.filters,
      payload: this.payload,
      mode: this.mode,
    };
    this.log.push(op);
    return Promise.resolve(this.resolve(op) ?? { data: this.mode === 'many' ? [] : null, error: null });
  }

  then<R1 = FakeResult, R2 = never>(
    onfulfilled?: ((value: FakeResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export function createFakeSupabase(resolve: Resolver, user: { id: string } | null = { id: 'user-1' }) {
  const log: FakeOp[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table: string) => new Query(table, resolve, log),
    rpc: (name: string, payload: unknown) => {
      const op: FakeOp = { table: `rpc:${name}`, action: 'rpc', filters: [], payload, mode: 'single' };
      log.push(op);
      return Promise.resolve(resolve(op) ?? { data: null, error: null });
    },
  };
  return { client, log };
}
