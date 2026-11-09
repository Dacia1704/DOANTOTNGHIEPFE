import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RolePermissionService } from './role-permission.service';
describe('Role permission API contract', () => {
  let api: RolePermissionService, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(RolePermissionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('reads the matrix and sends the current role version with the requested state', () => {
    api
      .matrix()
      .subscribe((matrix) => expect(matrix.roles[0].lockedPermissionIds).toEqual(['protected']));
    http
      .expectOne('/api/admin/role-permissions')
      .flush({
        data: {
          roles: [
            {
              id: 'role',
              code: 'ADMIN',
              name: 'Quản trị',
              version: 3,
              permissionIds: ['p'],
              lockedPermissionIds: ['protected'],
            },
          ],
          permissions: [{ id: 'p', code: 'USER_READ', name: 'Xem người dùng', module: 'USER' }],
        },
      });
    api
      .change('role', 'p', { enabled: false, expectedVersion: 3 })
      .subscribe((r) => expect(r.version).toBe(4));
    const req = http.expectOne('/api/admin/roles/role/permissions/p');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ enabled: false, expectedVersion: 3 });
    req.flush({ data: { roleId: 'role', permissionId: 'p', enabled: false, version: 4 } });
  });
  it('maps snake case audit fields and preserves boolean/numeric flags', () => {
    api.audit(2, 10).subscribe((rows) => {
      expect(rows[0]).toMatchObject({
        actor: 'Nguyễn An',
        role: 'ADMIN',
        permission: 'USER_READ',
        before: true,
        enabled: false,
        version: 4,
      });
      expect(rows[0].createdAt.toISOString()).toBe('2026-11-09T03:00:00.000Z');
    });
    const req = http.expectOne('/api/admin/role-permissions/audit?page=2&size=10');
    req.flush({
      data: [
        {
          id: 'a',
          actor_id: 'u',
          actor_name: 'Nguyễn An',
          role_id: 'r',
          role_code: 'ADMIN',
          permission_id: 'p',
          permission_code: 'USER_READ',
          old_enabled: 1,
          new_enabled: false,
          role_version: 4,
          created_at: '2026-11-09 10:00:00',
        },
      ],
    });
  });
});
