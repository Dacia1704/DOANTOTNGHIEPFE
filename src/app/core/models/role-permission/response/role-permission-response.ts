export interface PermissionResponse {
  id: string;
  code: string;
  name: string;
  module: string;
}
export interface PermissionRoleResponse {
  id: string;
  code: string;
  name: string;
  version: number;
  permissionIds: string[];
  lockedPermissionIds: string[];
}
export interface RolePermissionMatrixResponse {
  roles: PermissionRoleResponse[];
  permissions: PermissionResponse[];
}
export interface PermissionChangeResponse {
  roleId: string;
  permissionId: string;
  enabled: boolean;
  version: number;
}
export interface PermissionAuditResponse {
  id: string;
  actor_id: string;
  actor_name: string | null;
  role_id: string;
  role_code: string | null;
  permission_id: string;
  permission_code: string | null;
  old_enabled: boolean | number;
  new_enabled: boolean | number;
  role_version: number;
  created_at: string;
}
