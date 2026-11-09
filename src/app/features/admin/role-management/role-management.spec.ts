import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '@services/auth/auth.service';
import { RolePermissionService } from '@services/role-permission/role-permission.service';
import { RoleManagementComponent } from './role-management';
import { PermissionChange } from '@model/role-permission/role-permission.model';
const matrix = () => ({
  permissions: [
    { id: 'p', code: 'USER_READ', name: 'Xem người dùng', module: 'USER' },
    { id: 'protected', code: 'ROLE_PERMISSION_READ', name: 'Xem phân quyền', module: 'ROLE' },
  ],
  roles: [
    {
      id: 'r',
      code: 'ADMIN',
      name: 'Quản trị viên',
      version: 3,
      permissionIds: ['protected'],
      lockedPermissionIds: ['protected'],
    },
    {
      id: 'tenant',
      code: 'TENANT',
      name: 'Người thuê',
      version: 0,
      permissionIds: [],
      lockedPermissionIds: ['protected'],
    },
  ],
});
describe('Role permission matrix', () => {
  let manage: boolean;
  const api = { matrix: vi.fn(), change: vi.fn(), audit: vi.fn() };
  beforeEach(() => {
    manage = true;
    vi.resetAllMocks();
    api.matrix.mockImplementation(() => of(matrix()));
    api.audit.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [RoleManagementComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            refreshAuthorities: () => of(['ROLE_PERMISSION_MANAGE']),
            hasPermission: () => manage,
          },
        },
        { provide: RolePermissionService, useValue: api },
      ],
    });
  });
  function event(checked: boolean) {
    return { target: { checked } } as unknown as Event;
  }
  it('disables protected cells and does not send writes for a read-only account', () => {
    const f = TestBed.createComponent(RoleManagementComponent);
    f.detectChanges();
    const c = f.componentInstance,
      data = c.matrix()!;
    c.toggle(data.roles[0], data.permissions[1], event(false));
    expect(api.change).not.toHaveBeenCalled();
    manage = false;
    c.rightsReady.set(false);
    c.rightsReady.set(true);
    f.detectChanges();
    expect(
      [...f.nativeElement.querySelectorAll('input[type=checkbox]')].every(
        (input: any) => input.disabled,
      ),
    ).toBe(true);
    c.toggle(data.roles[0], data.permissions[0], event(true));
    expect(api.change).not.toHaveBeenCalled();
  });
  it('serializes edits and applies the returned version before the next change', () => {
    const c = TestBed.createComponent(RoleManagementComponent).componentInstance;
    const response = new Subject<PermissionChange>();
    api.change.mockReturnValue(response);
    let data = c.matrix()!;
    c.toggle(data.roles[0], data.permissions[0], event(true));
    c.toggle(data.roles[0], data.permissions[0], event(true));
    expect(api.change).toHaveBeenCalledTimes(1);
    expect(api.change).toHaveBeenLastCalledWith('r', 'p', { enabled: true, expectedVersion: 3 });
    response.next({ roleId: 'r', permissionId: 'p', enabled: true, version: 4 });
    response.complete();
    data = c.matrix()!;
    expect(data.roles[0].permissionIds).toContain('p');
    expect(data.roles[0].version).toBe(4);
    api.change.mockReturnValue(of({ roleId: 'r', permissionId: 'p', enabled: false, version: 5 }));
    c.toggle(data.roles[0], data.permissions[0], event(false));
    expect(api.change).toHaveBeenLastCalledWith('r', 'p', { enabled: false, expectedVersion: 4 });
  });
  it('restores the checkbox after a failed write and refreshes on a version conflict', () => {
    const c = TestBed.createComponent(RoleManagementComponent).componentInstance;
    api.change.mockReturnValue(throwError(() => ({ status: 409 })));
    const inputEvent = event(true),
      data = c.matrix()!;
    c.toggle(data.roles[0], data.permissions[0], inputEvent);
    expect((inputEvent.target as HTMLInputElement).checked).toBe(false);
    expect(c.matrix()!.roles[0].permissionIds).not.toContain('p');
    expect(api.matrix).toHaveBeenCalledTimes(2);
    expect(c.feedback()).toContain('Đã tải lại');
  });
  it('searches both permission labels and role names using the backend catalog', () => {
    const c = TestBed.createComponent(RoleManagementComponent).componentInstance;
    c.query.set('USER_READ');
    expect(c.visiblePermissions().map((p) => p.id)).toEqual(['p']);
    c.query.set('người thuê');
    expect(c.visibleRoles().map((r) => r.code)).toEqual(['TENANT']);
    expect(c.visiblePermissions()).toHaveLength(2);
    c.query.set('không tồn tại');
    expect(c.visiblePermissions()).toEqual([]);
  });
});
