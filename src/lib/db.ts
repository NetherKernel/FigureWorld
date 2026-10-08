/**
 * FiguresWorld Database Layer.
 * MongoDB and Mongoose have been completely removed in favor of Supabase PostgreSQL.
 * connectToDatabase is maintained as a zero-latency no-op for any external callers.
 */
export async function connectToDatabase(): Promise<null> {
  return null;
}

export async function disconnectDatabase(): Promise<void> {
  // No-op
}
