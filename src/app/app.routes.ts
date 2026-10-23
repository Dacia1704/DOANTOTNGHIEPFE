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
        path: 'trang-ca-nhan',
        canActivate: [roleGuard([RoleCode.TENANT, RoleCode.LANDLORD, RoleCode.ADMIN])],
        loadComponent: () => import('./features/profile/pages/profile-page/profile-page.component').then(m => m.ProfilePageComponent),
      },
      {
        path: 'phong-cua-toi',
        canActivate: [roleGuard([RoleCode.LANDLORD])],
        loadComponent: () => import('./features/room/pages/room-management-page/room-management-page.component').then(m => m.RoomManagementPageComponent),
      },
      {
        path: 'dang-tin',
        canActivate: [roleGuard([RoleCode.LANDLORD])],
        loadComponent: () => import('./features/room/pages/room-management-page/room-management-page.component').then(m => m.RoomManagementPageComponent),
      },
      {
        path: 'quan-ly-loai-phong',
        canActivate: [roleGuard([RoleCode.LANDLORD])],
        loadComponent: () => import('./features/admin/room-type-management/room-type-management.component').then(m => m.RoomTypeManagementComponent),
      },
      {
        path: 'loai-phong',
        redirectTo: 'quan-ly-loai-phong',
        pathMatch: 'full',
      },
      {
        path: 'quan-ly-tien-ich',
        canActivate: [roleGuard([RoleCode.LANDLORD])],
        loadComponent: () => import('./features/admin/amenity-management/amenity-management.component').then(m => m.AmenityManagementComponent),
      },
      {
        path: 'tien-ich',
        redirectTo: 'quan-ly-tien-ich',
        pathMatch: 'full',
      },
      {
        path: 'landlord',
        redirectTo: 'phong-cua-toi',
        pathMatch: 'full',
      },
      {
        path: 'danh-sach-phong',
        loadComponent: () => import('./features/room/pages/room-management-page/room-management-page.component').then(m => m.RoomManagementPageComponent),
      },
      {
        path: 'cai-dat',
        redirectTo: 'trang-ca-nhan',
        pathMatch: 'full',
      },

      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        data: { purpose: 'password' },
        loadComponent: () => import('./features/auth/otp/otp-page.component').then(m => m.OtpPageComponent),
      },
      {
        path: 'verify-email',
        data: { purpose: 'email' },
        loadComponent: () => import('./features/auth/otp/otp-page.component').then(m => m.OtpPageComponent),
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
