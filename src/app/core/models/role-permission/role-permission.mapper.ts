import { PermissionAudit, PermissionChange, RolePermissionMatrix } from './role-permission.model';
import {
  PermissionAuditResponse,
  PermissionChangeResponse,
  RolePermissionMatrixResponse,
} from './response/role-permission-response';
export class RolePermissionMapper {
  static matrix(r: RolePermissionMatrixResponse): RolePermissionMatrix {
    return {
      permissions: r.permissions.map((p) => ({ ...p })),
      roles: r.roles.map((role) => ({
        ...role,
        permissionIds: [...role.permissionIds],
        lockedPermissionIds: [...role.lockedPermissionIds],
      })),
    };
  }
  static change(r: PermissionChangeResponse): PermissionChange {
    return { ...r };
  }
  static audit(r: PermissionAuditResponse): PermissionAudit {
    return {
      id: r.id,
      actor: r.actor_name || r.actor_id,
      role: r.role_code || r.role_id,
      permission: r.permission_code || r.permission_id,
      before: r.old_enabled === true || r.old_enabled === 1,
      enabled: r.new_enabled === true || r.new_enabled === 1,
      version: r.role_version,
      createdAt: new Date(
        /(?:Z|[+-]\d{2}:?\d{2})$/.test(r.created_at)
          ? r.created_at
          : `${r.created_at.replace(' ', 'T')}+07:00`,
      ),
    };
  }
}
