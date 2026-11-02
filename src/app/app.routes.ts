import { Routes } from '@angular/router';
import { roleGuard } from '@guards/role.guard';
import { RoleCode } from '@model/auth/auth.model';

export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [roleGuard([RoleCode.ADMIN])],
    canActivateChild: [roleGuard([RoleCode.ADMIN])],
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  // Pathless group keeps existing landlord URLs and payment return URLs working.
  {
    path: '',
    // An empty child URL would otherwise activate this layout without a page.
    canMatch: [(_route, segments) => segments.length > 0],
    canActivate: [roleGuard([RoleCode.LANDLORD])],
    canActivateChild: [roleGuard([RoleCode.LANDLORD])],
    loadComponent: () =>
      import('./layouts/landlord-layout/landlord-layout').then((m) => m.LandlordLayout),
    loadChildren: () =>
      import('./features/landlord/landlord.routes').then((m) => m.LANDLORD_ROUTES),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/tenant-layout/tenant-layout.component').then(
        (m) => m.TenantLayoutComponent,
      ),
    children: [
      {
        path: '',
        canMatch: [(_route, segments) => segments.length > 0],
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('./features/tenant/tenant.routes').then((m) => m.TENANT_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
