export type UserDocument = {
    _id: any;
    avatar: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  
  export interface UserListItem {
    _id: string;
    avatar: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt: Date;
  }
  
import { UserRole } from '../schemas/user.schema';

export interface UsersFilterOptions {
  status?: 'all' | 'active' | 'inactive';
  search?: string;
  role?: UserRole;
  campusId?: string;
  roomId?: string;
}
  
  export interface UsersPaginationOptions {
    page: number;
    limit: number;
  }
  
  export interface UsersSortOptions {
    field: string;
    direction: 'asc' | 'desc';
  }
  
  export interface UsersResponse {
    users: UserListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
  
  export interface RoleDetail {
    category: string;
    permission: string;
    description: string;
  }
  
  export interface RoleInfo {
    name: string;
    isSystemRole: boolean;
    description: string;
    accessScope: string;
    usersAssigned: number;
    permissions: number;
    createdAt: Date; // Timestamp indicating when the role was created
    details: RoleDetail[];
  }
  
  export interface UserStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    administrators: number;
  }
  
  export interface UserWithPermissions {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    accessScope?: string;
    roleDetails: {
      description: string;
      accessScope: string;
      permissions: number;
      permissionStrings: string[];
      details: RoleDetail[];
    };
    [key: string]: any; // Allow additional properties
  }