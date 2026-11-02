import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '@services/auth/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import { routes } from './app.routes';
import { ADMIN_ROUTES } from './features/admin/admin.routes';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { LANDLORD_ROUTES } from './features/landlord/landlord.routes';
import { TENANT_ROUTES } from './features/tenant/tenant.routes';

@Component({ selector: 'test-admin-shell', template: '<router-outlet />', imports: [RouterOutlet] })
class AdminShell {}
@Component({
  selector: 'test-landlord-shell',
  template: '<router-outlet />',
  imports: [RouterOutlet],
})
class LandlordShell {}
@Component({
  selector: 'test-tenant-shell',
  template: '<router-outlet />',
  imports: [RouterOutlet],
})
class TenantShell {}
@Component({ selector: 'test-page', template: 'Page' })
class Page {}

// Exercise the production route tables and guards without API calls from page components.
const pages = (entries: Routes): Routes =>
  entries.map((route) => ({
    ...route,
    ...(route.children ? { children: pages(route.children) } : {}),
    ...(route.loadComponent ? { loadComponent: () => Promise.resolve(Page) } : {}),
  }));

describe('role layouts and navigation', () => {
  let role: RoleCode;
  let loggedIn: boolean;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    role = RoleCode.TENANT;
    loggedIn = true;
    const testRoutes: Routes = [
      {
        ...routes[0],
        loadComponent: () => Promise.resolve(AdminShell),
        loadChildren: () => Promise.resolve(pages(ADMIN_ROUTES)),
      },
      {
        ...routes[1],
        loadComponent: () => Promise.resolve(LandlordShell),
        loadChildren: () => Promise.resolve(pages(LANDLORD_ROUTES)),
      },
      {
        ...routes[2],
        loadComponent: () => Promise.resolve(TenantShell),
        children: [
          { ...routes[2].children![0], loadChildren: () => Promise.resolve(pages(AUTH_ROUTES)) },
          { ...routes[2].children![1], loadChildren: () => Promise.resolve(pages(TENANT_ROUTES)) },
        ],
      },
      routes[3],
    ];
    TestBed.configureTestingModule({
      providers: [
        provideRouter(testRoutes),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => loggedIn,
            hasAnyRole: (roles: RoleCode[]) => roles.includes(role),
            homeUrl: () => (role === RoleCode.ADMIN ? '/admin' : '/'),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  it('keeps public and auth pages accessible to guests', async () => {
    loggedIn = false;
    for (const url of ['/', '/login', '/register', '/forgot-password', '/tro/post']) {
      await harness.navigateByUrl(url, TenantShell);
      expect(router.url).toBe(url);
    }
  });

  it('renders landlord tools and their old URLs in the dashboard', async () => {
    role = RoleCode.LANDLORD;
    for (const url of [
      '/phong-cua-toi',
      '/tin-cua-toi',
      '/quan-ly-dat-phong',
      '/goi-dich-vu',
      '/lich-su-thanh-toan',
      '/landlord/messages',
      '/landlord/agreements/contract',
    ]) {
      await harness.navigateByUrl(url, LandlordShell);
      expect(router.url).toBe(url);
    }
    await harness.navigateByUrl('/landlord', LandlordShell);
    expect(router.url).toBe('/phong-cua-toi');
    await harness.navigateByUrl('/dang-tin', LandlordShell);
    expect(router.url).toBe('/tin-cua-toi');
    await harness.navigateByUrl('/boost', LandlordShell);
    expect(router.url).toBe('/goi-dich-vu?tab=boost');
  });

  it('keeps the landlord landing page in the public layout', async () => {
    role = RoleCode.LANDLORD;
    await harness.navigateByUrl('/', TenantShell);
    expect(router.url).toBe('/');
  });

  it('preserves payment return query parameters', async () => {
    role = RoleCode.LANDLORD;
    const url = '/thanh-toan/ket-qua?vnp_TxnRef=order-123&vnp_ResponseCode=00';
    await harness.navigateByUrl(url, LandlordShell);
    expect(router.url).toBe(url);
  });

  it('selects role layouts for shared legacy URLs', async () => {
    role = RoleCode.LANDLORD;
    for (const [oldUrl, newUrl] of [
      ['/tin-nhan?conversation=chat', '/landlord/messages?conversation=chat'],
      ['/hop-dong/contract', '/landlord/agreements/contract'],
    ]) {
      await harness.navigateByUrl(oldUrl, LandlordShell);
      expect(router.url).toBe(newUrl);
    }
    role = RoleCode.TENANT;
    for (const url of ['/trang-ca-nhan', '/tin-nhan', '/hop-dong/contract']) {
      await harness.navigateByUrl(url, TenantShell);
      expect(router.url).toBe(url);
    }
  });

  it('sends guests to login with the original destination', async () => {
    loggedIn = false;
    await harness.navigateByUrl('/tin-cua-toi', TenantShell);
    expect(router.parseUrl(router.url).queryParams['redirect']).toBe('/tin-cua-toi');
    expect(router.url.split('?')[0]).toBe('/login');
  });

  it('prevents tenants from entering landlord and admin dashboards', async () => {
    for (const url of ['/phong-cua-toi', '/admin/users']) {
      await harness.navigateByUrl(url, TenantShell);
      expect(router.url).toBe('/');
    }
  });

  it.each([RoleCode.TENANT, RoleCode.LANDLORD, RoleCode.ADMIN])(
    'uses one shared profile route for %s',
    async (userRole) => {
      role = userRole;
      await harness.navigateByUrl('/trang-ca-nhan', TenantShell);
      expect(router.url).toBe('/trang-ca-nhan');
      for (const alias of ['/cai-dat', '/landlord/profile', '/admin/profile']) {
        await harness.navigateByUrl(alias + '?section=security#account', TenantShell);
        expect(router.url).toBe('/trang-ca-nhan?section=security#account');
      }
    },
  );

  it('requires login for the shared profile page', async () => {
    loggedIn = false;
    await harness.navigateByUrl('/trang-ca-nhan', TenantShell);
    expect(router.url.split('?')[0]).toBe('/login');
    expect(router.parseUrl(router.url).queryParams['redirect']).toBe('/trang-ca-nhan');
  });

  it('checks access again when navigating between landlord children', async () => {
    role = RoleCode.LANDLORD;
    await harness.navigateByUrl('/phong-cua-toi', LandlordShell);
    loggedIn = false;
    await harness.navigateByUrl('/tin-cua-toi', TenantShell);
    expect(router.url.split('?')[0]).toBe('/login');
  });

  it('keeps admin pages and tenant rentals in their own layouts', async () => {
    role = RoleCode.ADMIN;
    await harness.navigateByUrl('/admin/users', AdminShell);
    role = RoleCode.TENANT;
    await harness.navigateByUrl('/yeu-cau-thue', TenantShell);
    expect(router.url).toBe('/yeu-cau-thue');
  });
});
