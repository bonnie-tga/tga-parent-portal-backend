type Id = string | { toString(): string };

export type UserMinimal = {
  role: string;                 // e.g. 'administrator', 'director', ...
  accessScope: string;          // 'all' | 'multiple_campus' | 'single_campus' | 'single_room' | 'own_children'
  campuses?: Id[];
  rooms?: Id[];
  children?: Id[];
};

function toStringIds(list?: Id[]): string[] {
  return (list || []).map((x) => x?.toString());
}

export function isAdministrator(user?: { role?: string }): boolean {
  if (!user || user.role == null) return false;
  try {
    return String(user.role).toLowerCase() === 'administrator';
  } catch {
    return false;
  }
}

export function buildCampusFilter(user?: UserMinimal): Record<string, any> {
  if (!user) return {};
  if (isAdministrator(user)) return {};

  const campuses = toStringIds(user.campuses);

  if (user.accessScope === 'multiple_campus') return campuses.length ? { _id: { $in: campuses } } : { _id: { $in: [] } };
  if (user.accessScope === 'single_campus')  return campuses[0] ? { _id: campuses[0] } : { _id: { $in: [] } };
  if (user.accessScope === 'single_room')    return campuses.length ? { _id: { $in: campuses } } : { _id: { $in: [] } };
  if (user.accessScope === 'own_children')    return campuses.length ? { _id: { $in: campuses } } : { _id: { $in: [] } };

  return {};
}

export function buildRoomFilter(user?: UserMinimal): Record<string, any> {
  if (!user) return {};
  if (isAdministrator(user)) return {};

  const campuses = toStringIds(user.campuses);
  const rooms = toStringIds(user.rooms);

  if (user.accessScope === 'multiple_campus') return campuses.length ? { campus: { $in: campuses } } : { _id: { $in: [] } };
  if (user.accessScope === 'single_campus')  return campuses[0] ? { campus: campuses[0] } : { _id: { $in: [] } };
  if (user.accessScope === 'single_room')    return rooms[0] ? { _id: rooms[0] } : { _id: { $in: [] } };
  if (user.accessScope === 'own_children')    return rooms.length ? { _id: { $in: rooms } } : { _id: { $in: [] } };

  return {};
}

export function buildChildFilter(user?: UserMinimal): Record<string, any> {
  if (!user) return {};
  if (isAdministrator(user)) return {};

  const campuses = toStringIds(user.campuses);
  const rooms = toStringIds(user.rooms);
  const children = toStringIds(user.children);

  if (user.accessScope === 'multiple_campus') return campuses.length ? { campus: { $in: campuses } } : { _id: { $in: [] } };
  if (user.accessScope === 'single_campus')  return campuses[0] ? { campus: campuses[0] } : { _id: { $in: [] } };
  if (user.accessScope === 'single_room')    return rooms[0] ? { room: rooms[0] } : { _id: { $in: [] } };
  if (user.accessScope === 'own_children')    return children.length ? { _id: { $in: children } } : { _id: { $in: [] } };

  return {};
}

export function buildUserAccessFilter(user?: UserMinimal): Record<string, any> {
  if (!user) return {};
  if (isAdministrator(user)) return {};

  const campuses = toStringIds(user.campuses);
  const rooms = toStringIds(user.rooms);
  const children = toStringIds(user.children);

  if (user.accessScope === 'multiple_campus') {
    const ors: any[] = [];
    if (campuses.length) ors.push({ campuses: { $in: campuses } });
    if (rooms.length) ors.push({ rooms: { $in: rooms } });
    return ors.length ? { $or: ors } : { _id: { $in: [] } };
  }

  if (user.accessScope === 'single_campus') {
    const singleCampus = campuses[0];
    if (singleCampus) return { campuses: singleCampus };
    // if user also has rooms, allow by rooms
    if (rooms.length) return { rooms: { $in: rooms } };
    return { _id: { $in: [] } };
  }

  if (user.accessScope === 'single_room') {
    const singleRoom = rooms[0];
    return singleRoom ? { rooms: singleRoom } : { _id: { $in: [] } };
  }

  if (user.accessScope === 'own_children') {
    const ors: any[] = [];
    if (children.length) ors.push({ children: { $in: children } });
    if (rooms.length) ors.push({ rooms: { $in: rooms } });
    if (campuses.length) ors.push({ campuses: { $in: campuses } });
    return ors.length ? { $or: ors } : { _id: { $in: [] } };
  }

  return {};
}

// Generic: build campus-based access for an entity that stores campus references
// fieldName defaults to 'campuses'. If campusIds is empty, returns filter that matches
// entities without campuses (treated as global).
export function buildEntityCampusAccessFilterByIds(
  campusIds: Array<Id> | undefined,
  fieldName: string = 'campuses',
): Record<string, any> {
  const ids = toStringIds(campusIds as any);
  if (ids.length > 0) {
    return {
      $or: [
        { [fieldName]: { $in: ids } },
        { [fieldName]: { $exists: false } },
        { [fieldName]: { $size: 0 } },
      ],
    };
  }
  return {
    $or: [
      { [fieldName]: { $exists: false } },
      { [fieldName]: { $size: 0 } },
    ],
  };
}

// Strict: only entities whose [fieldName] intersect campusIds; empty campusIds => no results
export function buildStrictCampusInFilterByIds(
  campusIds: Array<Id> | undefined,
  fieldName: string = 'campuses',
): Record<string, any> {
  const ids = toStringIds(campusIds as any);
  if (ids.length > 0) {
    return { [fieldName]: { $in: ids } } as any;
  }
  return { _id: { $in: [] } } as any;
}

// Announcements: allow scope 'all' or match by campuses/rooms (non-admin only)
export function buildAnnouncementAccessFilter(
  user?: UserMinimal,
  opts?: { includeGlobal?: boolean },
): Record<string, any> {
  if (!user) return {};
  if (isAdministrator(user)) return {};
  const includeGlobal = opts?.includeGlobal !== false;
  const campuses = toStringIds(user.campuses);
  const rooms = toStringIds(user.rooms);
  const ors: any[] = [];
  if (includeGlobal) ors.push({ scope: 'all' });
  if (campuses.length) ors.push({ campuses: { $in: campuses } });
  if (rooms.length) ors.push({ rooms: { $in: rooms } });
  return ors.length ? { $or: ors } : { _id: { $in: [] } };
}

// Polls: strict campus-only access for non-admins (no global)
export function buildPollAccessFilter(user?: UserMinimal): Record<string, any> {
  if (!user) return {};
  if (isAdministrator(user)) return {};
  const campuses = toStringIds(user.campuses);
  return campuses.length ? { campuses: { $in: campuses } } : { _id: { $in: [] } };
}

/**
 * Check if user has access to a specific campus ID
 * @param user User object with role, accessScope, and campuses
 * @param campusId Campus ID to check (can be ObjectId, string, or populated object)
 * @returns true if user has access to the campus
 */
export function hasCampusAccess(user: UserMinimal, campusId: any): boolean {
  if (!user || !campusId) return false;
  if (isAdministrator(user)) return true;

  const userCampusIds = toStringIds(user.campuses);
  const targetCampusId = campusId?.toString?.() || campusId?._id?.toString?.() || String(campusId);

  if (user.accessScope === 'multiple_campus' || user.accessScope === 'single_campus') {
    return userCampusIds.includes(targetCampusId);
  }

  if (user.accessScope === 'single_room' || user.accessScope === 'own_children') {
    // For single_room and own_children, check if campus is in user's campuses
    return userCampusIds.includes(targetCampusId);
  }

  return false;
}

/**
 * Check if user has access to a specific room ID
 * @param user User object with role, accessScope, and rooms
 * @param roomId Room ID to check (can be ObjectId, string, or populated object)
 * @returns true if user has access to the room
 */
export function hasRoomAccess(user: UserMinimal, roomId: any): boolean {
  if (!user || !roomId) return false;
  if (isAdministrator(user)) return true;

  const userRoomIds = toStringIds(user.rooms);
  const targetRoomId = roomId?.toString?.() || roomId?._id?.toString?.() || String(roomId);

  if (user.accessScope === 'single_room') {
    return userRoomIds.includes(targetRoomId);
  }

  if (user.accessScope === 'own_children') {
    return userRoomIds.includes(targetRoomId);
  }

  // For multiple_campus and single_campus, room access is not directly checked
  // but can be allowed if user has rooms assigned
  if (user.accessScope === 'multiple_campus' || user.accessScope === 'single_campus') {
    return userRoomIds.includes(targetRoomId);
  }

  return false;
}

 



