import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, of, switchMap } from 'rxjs';
import {
  ManagedPermission,
  PermissionRole,
  RolePermissionMatrix,
  PermissionAudit,
} from '@model/role-permission/role-permission.model';
import { RolePermissionService } from '@services/role-permission/role-permission.service';
import { AuthService } from '@services/auth/auth.service';

@Component({
  selector: 'app-role-management',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './role-management.html',
  styleUrl: './role-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleManagementComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(RolePermissionService);
  private readonly destroy = inject(DestroyRef);
  readonly matrix = signal<RolePermissionMatrix | null>(null);
  readonly loading = signal(false);
  readonly pending = signal<string | null>(null);
  readonly rightsReady = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly feedbackKind = signal<'success' | 'error' | 'info'>('success');
  readonly query = signal('');
  readonly auditOpen = signal(false);
  readonly audit = signal<PermissionAudit[]>([]);
  readonly auditLoading = signal(false);
  readonly auditError = signal('');
  readonly auditPage = signal(0);
  readonly auditSize = 10;
  readonly canEdit = computed(
    () => this.rightsReady() && this.auth.hasPermission('ROLE_PERMISSION_MANAGE'),
  );
  readonly visiblePermissions = computed(() => {
    const all = this.matrix()?.permissions ?? [],
      q = this.query().trim().toLocaleLowerCase('vi');
    if (!q) return all;
    const permissions = all.filter((p) =>
      `${p.code} ${p.name} ${p.module}`.toLocaleLowerCase('vi').includes(q),
    );
    return permissions.length ? permissions : this.matchingRoles().length ? all : [];
  });
  readonly matchingRoles = computed(() => {
    const q = this.query().trim().toLocaleLowerCase('vi');
    return (this.matrix()?.roles ?? []).filter((r) =>
      `${r.code} ${r.name}`.toLocaleLowerCase('vi').includes(q),
    );
  });
  readonly visibleRoles = computed(() => {
    const roles = this.matrix()?.roles ?? [];
    return this.query().trim() && this.matchingRoles().length ? this.matchingRoles() : roles;
  });
  private request?: Subscription;
  private auditRequest?: Subscription;
  constructor() {
    this.load();
    this.destroy.onDestroy(() => {
      this.request?.unsubscribe();
      this.auditRequest?.unsubscribe();
    });
  }
  load(force = false) {
    if (this.pending() && !force) return;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.rightsReady.set(false);
    this.request = this.auth
      .refreshAuthorities()
      .pipe(
        switchMap(() => {
          this.rightsReady.set(true);
          return this.api.matrix();
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.matrix.set(data);
          if (this.auditOpen()) this.loadAudit(0);
        },
        error: (e) => {
          this.matrix.set(null);
          this.error.set(e.error?.message || 'Chưa tải được phân quyền. Vui lòng thử lại.');
        },
      });
  }
  has(role: PermissionRole, permission: ManagedPermission) {
    return role.permissionIds.includes(permission.id);
  }
  locked(role: PermissionRole, permission: ManagedPermission) {
    return role.lockedPermissionIds.includes(permission.id);
  }
  cellLabel(role: PermissionRole, permission: ManagedPermission) {
    return `${permission.name} · ${role.name || role.code}${this.locked(role, permission) ? ' · Quyền được bảo vệ' : ''}`;
  }
  toggle(role: PermissionRole, permission: ManagedPermission, event: Event) {
    const input = event.target as HTMLInputElement;
    const enabled = input.checked;
    input.checked = this.has(role, permission);
    if (
      !this.canEdit() ||
      this.pending() ||
      this.loading() ||
      this.locked(role, permission) ||
      enabled === this.has(role, permission)
    )
      return;
    this.pending.set(`${role.id}:${permission.id}`);
    this.feedback.set('');
    this.api
      .change(role.id, permission.id, { enabled, expectedVersion: role.version })
      .pipe(
        switchMap((change) => {
          this.matrix.update(
            (matrix) =>
              matrix && {
                ...matrix,
                roles: matrix.roles.map((r) =>
                  r.id !== change.roleId
                    ? r
                    : {
                        ...r,
                        version: change.version,
                        permissionIds: change.enabled
                          ? [...new Set([...r.permissionIds, change.permissionId])]
                          : r.permissionIds.filter((id) => id !== change.permissionId),
                      },
                ),
              },
          );
          this.feedbackKind.set('success');
          this.feedback.set(
            `Đã ${change.enabled ? 'cấp' : 'gỡ'} quyền “${permission.name}” cho ${role.name || role.code}.`,
          );
          if (this.auditOpen()) this.loadAudit(0);
          this.rightsReady.set(false);
          return this.auth.refreshAuthorities().pipe(
            catchError(() => {
              this.feedbackKind.set('info');
              this.feedback.set(
                'Thay đổi đã được lưu. Chưa đồng bộ được quyền hiện tại; hãy tải lại trước khi chỉnh tiếp.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(null)),
      )
      .subscribe({
        next: (authorities) => this.rightsReady.set(authorities !== null),
        error: (e) => {
          this.feedbackKind.set('error');
          this.feedback.set(
            e.status === 409
              ? 'Phân quyền đã thay đổi hoặc ô này được bảo vệ. Đã tải lại dữ liệu mới nhất; hãy kiểm tra trước khi thao tác lại.'
              : e.error?.message || 'Chưa lưu được thay đổi. Trạng thái quyền được giữ nguyên.',
          );
          if (e.status === 409 || e.status === 403) this.load(true);
        },
      });
  }
  toggleAudit(event: Event) {
    const open = (event.target as HTMLDetailsElement).open;
    this.auditOpen.set(open);
    if (open) this.loadAudit(0);
  }
  loadAudit(page = this.auditPage()) {
    this.auditRequest?.unsubscribe();
    this.auditLoading.set(true);
    this.auditError.set('');
    this.auditPage.set(page);
    this.auditRequest = this.api
      .audit(page, this.auditSize)
      .pipe(finalize(() => this.auditLoading.set(false)))
      .subscribe({
        next: (rows) => this.audit.set(rows),
        error: (e) => this.auditError.set(e.error?.message || 'Chưa tải được nhật ký phân quyền.'),
      });
  }
}
