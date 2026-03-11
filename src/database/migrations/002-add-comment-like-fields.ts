import { Db } from 'mongodb';

export const up = async (db: Db) => {
  console.log('Adding comment and like fields to announcements...');

  // Add new fields to existing announcements
  await db.collection('announcements').updateMany(
    { isCommentEnabled: { $exists: false } },
    { 
      $set: { 
        isCommentEnabled: true,
        likeCount: 0,
        commentCount: 0
      } 
    }
  );

  console.log('Comment and like fields added to announcements');
};

export const down = async (db: Db) => {
  console.log('Removing comment and like fields from announcements...');

  // Remove the new fields
  await db.collection('announcements').updateMany(
    {},
    { 
      $unset: { 
        isCommentEnabled: "",
        likeCount: "",
        commentCount: ""
      } 
    }
  );

  console.log('Comment and like fields removed from announcements');
};
