import type {PostgresAdapter} from '@payloadcms/db-postgres';
import {sql} from '@payloadcms/db-postgres';
import type {PayloadRequest} from 'payload';

export async function lockMedia(req: PayloadRequest, id: number) {
  const transaction = await req.transactionID;
  if (!transaction)
    throw new Error('Media writes require a database transaction.');
  if (req.payload.db.name !== 'postgres')
    throw new Error('Media locking requires PostgreSQL.');
  const database = req.payload.db as Pick<PostgresAdapter, 'sessions' | 'pool'>;
  const session = database.sessions[transaction];
  if (!session) throw new Error('Media transaction is unavailable.');
  await session.db.execute(
    sql`SELECT id FROM media WHERE id = ${id} FOR UPDATE`,
  );
}
export async function withMediaTransaction<T>(
  req: PayloadRequest,
  callback: () => Promise<T>,
): Promise<T> {
  const previous = req.transactionID;
  const transaction = await req.payload.db.beginTransaction();
  if (!transaction)
    throw new Error('Media writes require database transactions.');
  req.transactionID = transaction;
  try {
    const result = await callback();
    await req.payload.db.commitTransaction(transaction);
    return result;
  } catch (error) {
    await req.payload.db.rollbackTransaction(transaction);
    throw error;
  } finally {
    req.transactionID = previous;
  }
}
