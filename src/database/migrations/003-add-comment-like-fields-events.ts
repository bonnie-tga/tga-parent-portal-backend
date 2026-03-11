import { Db } from 'mongodb';

export const up = async (db: Db) => {
  console.log('Adding comment and like fields to events...');

  // Add new fields to existing events
  await db.collection('events').updateMany(
    { isCommentEnabled: { $exists: false } },
    { 
      $set: { 
        isCommentEnabled: true,
        likeCount: 0,
        commentCount: 0
      } 
    }
  );

  console.log('Comment and like fields added to events');
};

export const down = async (db: Db) => {
  console.log('Removing comment and like fields from events...');

  // Remove the new fields
  await db.collection('events').updateMany(
    {},
    { 
      $unset: { 
        isCommentEnabled: "",
        likeCount: "",
        commentCount: ""
      } 
    }
  );

  console.log('Comment and like fields removed from events');
};
