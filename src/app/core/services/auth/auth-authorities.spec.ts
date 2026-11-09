import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
describe('Effective authority synchronization', () => {
  let auth: AuthService, http: HttpTestingController;
  beforeEach(() => {
    localStorage.setItem(
      'trotot_auth',
      JSON.stringify({
        id: 'admin',
        authorities: ['ROLE_ADMIN', 'USER_READ'],
        roles: ['ADMIN'],
        accessToken: 'local-only',
        refreshToken: 'local-refresh',
      }),
    );
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem('trotot_auth');
  });
  it('updates grants/revocations while preserving login tokens', () => {
    auth.refreshAuthorities().subscribe();
    http
      .expectOne('/api/users/me/authorities')
      .flush({ data: ['ROLE_ADMIN', 'ROLE_PERMISSION_READ'] });
    expect(auth.hasPermission('USER_READ')).toBe(false);
    expect(auth.hasPermission('ROLE_PERMISSION_READ')).toBe(true);
    expect(auth.accessToken).toBe('local-only');
    expect(auth.refreshToken).toBe('local-refresh');
  });
  it('does not replace the session for unchanged permissions or restore a logged out account', () => {
    const before = auth.session();
    auth.refreshAuthorities().subscribe();
    http.expectOne('/api/users/me/authorities').flush({ data: ['USER_READ', 'ROLE_ADMIN'] });
    expect(auth.session()).toBe(before);
    auth.refreshAuthorities().subscribe();
    auth.clearSession(false);
    http.expectOne('/api/users/me/authorities').flush({ data: ['ROLE_ADMIN', 'USER_READ'] });
    expect(auth.session()).toBeNull();
  });
});
