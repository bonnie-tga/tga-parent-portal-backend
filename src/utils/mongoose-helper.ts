import { Types } from 'mongoose';

/**
 * Helper function to extract ObjectId string from various formats
 * Handles: ObjectId, string, object with _id property, populated Mongoose documents
 */
function extractObjectIdString(id: any): string | null {
  if (!id) return null;
  
  try {
    // If it's an ObjectId instance
    if (id instanceof Types.ObjectId) {
      return id.toString();
    }
    
    // If it's already a string
    if (typeof id === 'string') {
      return id;
    }
    
    // If it's an object with _id property (populated Mongoose document)
    if (typeof id === 'object' && id._id) {
      return extractObjectIdString(id._id);
    }
    
    // If it has toString method, try it
    if (typeof id.toString === 'function') {
      const str = id.toString();
      // Only use toString if it returns a valid ObjectId string (24 hex chars)
      if (typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str)) {
        return str;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to safely compare MongoDB ObjectIds
 * This works with both ObjectId instances, string representations, and populated objects
 */
export function compareObjectIds(id1: any, id2: any): boolean {
  const str1 = extractObjectIdString(id1);
  const str2 = extractObjectIdString(id2);
  
  if (!str1 || !str2) return false;
  
  return str1 === str2;
}

/**
 * Helper function to check if an ObjectId is in an array
 */
export function objectIdInArray(id: any, array: any[]): boolean {
  if (!id || !array || !Array.isArray(array)) return false;
  
  return array.some(item => compareObjectIds(id, item));
}


