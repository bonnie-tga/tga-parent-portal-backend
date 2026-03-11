import { ForbiddenException } from '@nestjs/common';
import { Types, Model } from 'mongoose';
import { User, UserRole } from '../../users/schemas/user.schema';
import { ChatThread, ChatThreadType, ChatThreadStatus } from '../schemas/chat-thread.schema';
import { ParentChat, ParentChatStatus } from '../../parent-chat/schemas/parent-chat.schema';
import { AccountChat, AccountChatStatus } from '../../account-chat/schemas/account-chat.schema';
import { ManagementChat, ManagementChatStatus } from '../../management-chat/schemas/management-chat.schema';

export function validateChatThreadAccess(thread: ChatThread, user: User): boolean {
  if (user.role === UserRole.ADMINISTRATOR) {
    return true;
  }

  if (thread.type === ChatThreadType.PARENT) {
    if (user.role === UserRole.PARENT) {
      const parentId = user._id.toString();
      const memberIds = thread.members.map((m) => {
        const memberId = m instanceof Types.ObjectId ? m : (m as any)._id || m;
        return memberId.toString();
      });
      return memberIds.includes(parentId);
    }

    if (user.role === UserRole.AREA_MANAGER || user.role === UserRole.DIRECTOR) {
      if (!thread.campus) return false;
      const threadCampusId = thread.campus instanceof Types.ObjectId 
        ? thread.campus.toString() 
        : (thread.campus as any)._id?.toString() || thread.campus.toString();
      const userCampusIds = (user.campuses || []).map((c) => c.toString());
      return userCampusIds.includes(threadCampusId);
    }

    if (
      user.role === UserRole.ASSISTANT_DIRECTOR ||
      user.role === UserRole.EDUCATIONAL_LEADER ||
      user.role === UserRole.CENTRE_LOGIN
    ) {
      if (!thread.campus) return false;
      const threadCampusId = thread.campus instanceof Types.ObjectId 
        ? thread.campus.toString() 
        : (thread.campus as any)._id?.toString() || thread.campus.toString();
      const userCampusIds = (user.campuses || []).map((c) => c.toString());
      return userCampusIds.length === 1 && userCampusIds[0] === threadCampusId;
    }

    if (user.role === UserRole.ROOM_LOGIN || user.role === UserRole.STAFF) {
      if (!thread.room) return false;
      const threadRoomId = thread.room instanceof Types.ObjectId 
        ? thread.room.toString() 
        : (thread.room as any)._id?.toString() || thread.room.toString();
      const userRoomIds = (user.rooms || []).map((r) => r.toString());
      return userRoomIds.includes(threadRoomId);
    }
  }

  if (thread.type === ChatThreadType.STAFF) {
    if (user.role === UserRole.PARENT) {
      return false;
    }
    const userId = user._id.toString();
    const memberIds = thread.members.map((m) => {
      const memberId = m instanceof Types.ObjectId ? m : (m as any)._id || m;
      return memberId.toString();
    });
    return memberIds.includes(userId);
  }

  if (thread.type === ChatThreadType.ACCOUNT) {
    const userId = user._id.toString();
    const memberIds = thread.members.map((m) => {
      const memberId = m instanceof Types.ObjectId ? m : (m as any)._id || m;
      return memberId.toString();
    });
    
    if (!memberIds.includes(userId)) {
      return false;
    }

    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.ENROLMENTS,
      UserRole.PARENT,
    ];
    
    return allowedRoles.includes(user.role);
  }

  if (
    thread.type === ChatThreadType.TEAM ||
    thread.type === ChatThreadType.MANAGEMENT
  ) {
    const userId = user._id.toString();
    const memberIds = thread.members.map((m) => {
      const memberId = m instanceof Types.ObjectId ? m : (m as any)._id || m;
      return memberId.toString();
    });
    return memberIds.includes(userId);
  }

  return false;
}

export function checkChatThreadAccess(thread: ChatThread, user: User): void {
  if (!validateChatThreadAccess(thread, user)) {
    throw new ForbiddenException('Access denied to this chat thread');
  }
}

export async function checkChatStatusForParent(
  thread: ChatThread,
  user: User,
  parentChatModel?: Model<ParentChat>,
  accountChatModel?: Model<AccountChat>,
  managementChatModel?: Model<ManagementChat>,
): Promise<void> {
  // Check Parent Chat status
  if (thread.type === ChatThreadType.PARENT) {
    if (user.role === UserRole.ADMINISTRATOR || 
        user.role === UserRole.AREA_MANAGER || 
        user.role === UserRole.DIRECTOR ||
        user.role === UserRole.ASSISTANT_DIRECTOR ||
        user.role === UserRole.EDUCATIONAL_LEADER ||
        user.role === UserRole.CENTRE_LOGIN ||
        user.role === UserRole.ROOM_LOGIN ||
        user.role === UserRole.STAFF) {
      return;
    }

    if (user.role === UserRole.PARENT) {
      if (thread.refModel === 'ParentChat' && thread.refId && parentChatModel) {
        let parentChatId: Types.ObjectId;
        if (thread.refId instanceof Types.ObjectId) {
          parentChatId = thread.refId;
        } else {
          const refIdAny = thread.refId as any;
          if (refIdAny._id) {
            parentChatId = refIdAny._id instanceof Types.ObjectId ? refIdAny._id : new Types.ObjectId(refIdAny._id.toString());
          } else {
            parentChatId = new Types.ObjectId(refIdAny.toString());
          }
        }
        
        const parentChat = await parentChatModel.findById(parentChatId).exec();
        
        if (!parentChat) {
          throw new ForbiddenException('Parent chat not found');
        }

        if (parentChat.status === ParentChatStatus.DRAFT) {
          throw new ForbiddenException('Chat is not available. Parent chat is in draft status.');
        }
      } else if (thread.status === ChatThreadStatus.DRAFT) {
        throw new ForbiddenException('Chat is not available. Thread is in draft status.');
      }
    }
    return;
  }

  // Check Account Chat status
  if (thread.type === ChatThreadType.ACCOUNT) {
    // All users (including Admin, Area Manager, Enrolment, and Parents) can only access published account chats
    if (thread.refModel === 'AccountChat' && thread.refId && accountChatModel) {
      let accountChatId: Types.ObjectId;
      if (thread.refId instanceof Types.ObjectId) {
        accountChatId = thread.refId;
      } else {
        const refIdAny = thread.refId as any;
        if (refIdAny._id) {
          accountChatId = refIdAny._id instanceof Types.ObjectId ? refIdAny._id : new Types.ObjectId(refIdAny._id.toString());
        } else {
          accountChatId = new Types.ObjectId(refIdAny.toString());
        }
      }
      
      const accountChat = await accountChatModel.findById(accountChatId).exec();
      
      if (!accountChat) {
        throw new ForbiddenException('Account chat not found');
      }

      if (accountChat.status === AccountChatStatus.DRAFT) {
        throw new ForbiddenException('Chat is not available. Account chat is in draft status.');
      }
    } else if (thread.status === ChatThreadStatus.DRAFT) {
      throw new ForbiddenException('Chat is not available. Thread is in draft status.');
    }
    return;
  }

  // Check Management Chat status
  if (thread.type === ChatThreadType.MANAGEMENT) {
    // All users (including Admin, Area Manager, Director, Assistant Director, Educational Leader, and Parents) can only access published management chats
    if (thread.refModel === 'ManagementChat' && thread.refId && managementChatModel) {
      let managementChatId: Types.ObjectId;
      if (thread.refId instanceof Types.ObjectId) {
        managementChatId = thread.refId;
      } else {
        const refIdAny = thread.refId as any;
        if (refIdAny._id) {
          managementChatId = refIdAny._id instanceof Types.ObjectId ? refIdAny._id : new Types.ObjectId(refIdAny._id.toString());
        } else {
          managementChatId = new Types.ObjectId(refIdAny.toString());
        }
      }
      
      const managementChat = await managementChatModel.findById(managementChatId).exec();
      
      if (!managementChat) {
        throw new ForbiddenException('Management chat not found');
      }

      if (managementChat.status === ManagementChatStatus.DRAFT) {
        throw new ForbiddenException('Chat is not available. Management chat is in draft status.');
      }
    } else if (thread.status === ChatThreadStatus.DRAFT) {
      throw new ForbiddenException('Chat is not available. Thread is in draft status.');
    }
    return;
  }

  // Staff and Team chats don't have DRAFT/PUBLISHED status model
  // They use OPEN/CLOSE decisionStatus and threads are always PUBLISHED when created
  if (thread.type === ChatThreadType.STAFF || thread.type === ChatThreadType.TEAM) {
    // Staff and Team chats are always accessible if user has access (checked in validateChatThreadAccess)
    // Thread status is always PUBLISHED when created
    return;
  }
}
