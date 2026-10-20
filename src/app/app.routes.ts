import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';
import { RoleCode } from './core/models/auth/auth.model';

export const routes: Routes = [
  // Tenant layout — bọc mọi trang public (landing, đăng nhập, đăng ký, ...)
  {
    path: '',
    loadComponent: () =>
      import('./layouts/tenant-layout/tenant-layout.component').then(m => m.TenantLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/landing/pages/landing-page/landing-page.component').then(m => m.LandingPageComponent),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
    ],
  },

  // Admin — layout riêng, không dùng tenant layout
  {
    path: 'admin',
    canActivate: [roleGuard([RoleCode.ADMIN])],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      { path: '', loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) },
    ],
  },

  // 404 — fallback về landing
  { path: '**', redirectTo: '' },
];