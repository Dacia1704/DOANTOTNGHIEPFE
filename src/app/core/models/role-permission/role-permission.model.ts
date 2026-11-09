export interface ManagedPermission {
  id: string;
  code: string;
  name: string;
  module: string;
}
export interface PermissionRole {
  id: string;
  code: string;
  name: string;
  version: number;
  permissionIds: string[];
  lockedPermissionIds: string[];
}
export interface RolePermissionMatrix {
  roles: PermissionRole[];
  permissions: ManagedPermission[];
}
export interface PermissionChange {
  roleId: string;
  permissionId: string;
  enabled: boolean;
  version: number;
}
export interface PermissionAudit {
  id: string;
  actor: string;
  role: string;
  permission: string;
  before: boolean;
  enabled: boolean;
  version: number;
  createdAt: Date;
}
