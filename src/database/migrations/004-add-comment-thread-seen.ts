import { Db } from 'mongodb';

export const up = async (db: Db) => {
  const coll = db.collection('comment_thread_seen');
  try {
    await coll.createIndex(
      { announcementId: 1, entityType: 1, userId: 1 },
      { unique: true, name: 'unique_staff_thread_seen' },
    );
  } catch (e: unknown) {
    if ((e as { code?: number })?.code !== 85 && (e as { codeName?: string })?.codeName !== 'IndexOptionsConflict') {
      throw e;
    }
  }
  try {
    await coll.createIndex({ userId: 1, lastSeenAt: -1 }, { name: 'idx_user_last_seen' });
  } catch (e: unknown) {
    if ((e as { code?: number })?.code !== 85 && (e as { codeName?: string })?.codeName !== 'IndexOptionsConflict') {
      throw e;
    }
  }
};

export const down = async (db: Db) => {
  await db.collection('comment_thread_seen').drop();
};
