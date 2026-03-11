import { Db } from 'mongodb';

export const up = async (db: Db) => {
  console.log('Creating indexes for polling system...');

  // Polls collection indexes
  await db.collection('polls').createIndex(
    { isForAllCampuses: 1, status: 1, startsAt: 1, endsAt: 1 },
    { name: 'idx_polls_targeting' }
  );

  await db.collection('polls').createIndex(
    { campuses: 1, status: 1, startsAt: 1, endsAt: 1 },
    { name: 'idx_polls_campus_status' }
  );

  await db.collection('polls').createIndex(
    { title: 'text', 'questions.text': 'text', 'questions.choices.label': 'text' },
    { name: 'idx_polls_fulltext', weights: { title: 10, 'questions.text': 5, 'questions.choices.label': 1 } }
  );

  await db.collection('polls').createIndex(
    { status: 1, createdAt: -1 },
    { name: 'idx_polls_status_date' }
  );

  // Poll responses collection indexes
  await db.collection('poll_responses').createIndex(
    { pollId: 1, questionId: 1, userId: 1 },
    { unique: true, name: 'uniq_user_vote_per_question' }
  );

  await db.collection('poll_responses').createIndex(
    { pollId: 1, campusId: 1, createdAt: -1 },
    { name: 'idx_responses_poll_campus' }
  );

  await db.collection('poll_responses').createIndex(
    { userId: 1, pollId: 1 },
    { name: 'idx_responses_user_poll' }
  );

  await db.collection('poll_responses').createIndex(
    { campusId: 1, createdAt: -1 },
    { name: 'idx_responses_campus_date' }
  );

  // Feed items collection indexes
  await db.collection('feed_items').createIndex(
    { isForAllCampuses: 1, campuses: 1, status: 1, visibleFrom: 1, visibleUntil: 1, createdAt: -1 },
    { name: 'idx_feed_targeting' }
  );

  await db.collection('feed_items').createIndex(
    { type: 1, refId: 1 },
    { name: 'idx_feed_type_ref' }
  );

  await db.collection('feed_items').createIndex(
    { isPinned: 1, createdAt: -1 },
    { name: 'idx_feed_pinned' }
  );

  await db.collection('feed_items').createIndex(
    { status: 1, createdAt: -1 },
    { name: 'idx_feed_status_date' }
  );

  console.log('✅ Polling system indexes created successfully');
};

export const down = async (db: Db) => {
  console.log('Dropping polling system indexes...');

  // Drop polls indexes
  await db.collection('polls').dropIndex('idx_polls_targeting');
  await db.collection('polls').dropIndex('idx_polls_campus_status');
  await db.collection('polls').dropIndex('idx_polls_fulltext');
  await db.collection('polls').dropIndex('idx_polls_status_date');

  // Drop poll_responses indexes
  await db.collection('poll_responses').dropIndex('uniq_user_vote_per_question');
  await db.collection('poll_responses').dropIndex('idx_responses_poll_campus');
  await db.collection('poll_responses').dropIndex('idx_responses_user_poll');
  await db.collection('poll_responses').dropIndex('idx_responses_campus_date');

  // Drop feed_items indexes
  await db.collection('feed_items').dropIndex('idx_feed_targeting');
  await db.collection('feed_items').dropIndex('idx_feed_type_ref');
  await db.collection('feed_items').dropIndex('idx_feed_pinned');
  await db.collection('feed_items').dropIndex('idx_feed_status_date');

  console.log('✅ Polling system indexes dropped');
};

