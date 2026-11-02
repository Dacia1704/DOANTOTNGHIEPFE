import { inject } from '@angular/core';
import { RedirectFunction, Router, Routes } from '@angular/router';
import { roleGuard } from '@guards/role.guard';
import { RoleCode } from '@model/auth/auth.model';
import { AuthService } from '@services/auth/auth.service';

const profileRedirect: RedirectFunction = ({ queryParams, fragment }) =>
  inject(Router).createUrlTree(['/trang-ca-nhan'], {
    queryParams,
    fragment: fragment ?? undefined,
  });

export const TENANT_ROUTES: Routes = [
  {
    path: 'cam-nang',
    title: 'Cẩm nang thuê / cho thuê trọ | Trọ Tốt',
    loadComponent: () =>
      import('./rental-guide/rental-guide-page.component').then((m) => m.RentalGuidePageComponent),
  },
  {
    path: 'yeu-cau-thue',
    canActivate: [roleGuard([RoleCode.TENANT])],
    loadComponent: () =>
      import('@shared/pages/rental/rental-list-page.component').then(
        (m) => m.RentalListPageComponent,
      ),
  },
  {
    path: 'hop-dong/:id',
    canActivate: [roleGuard([RoleCode.TENANT, RoleCode.LANDLORD, RoleCode.ADMIN])],
    loadComponent: () =>
      import('@shared/pages/rental/agreement-page.component').then((m) => m.AgreementPageComponent),
  },
  {
    path: 'tro/:id',
    loadComponent: () =>
      import('@features/tenant/listing/pages/listing-detail-page/listing-detail-page.component').then(
        (m) => m.ListingDetailPageComponent,
      ),
  },
  {
    path: '',
    canMatch: [() => inject(AuthService).hasAnyRole([RoleCode.ADMIN])],
    children: [
      {
        path: 'tin-nhan',
        pathMatch: 'full',
        redirectTo: ({ queryParams, fragment }) =>
          inject(Router).createUrlTree(['/admin/messages'], {
            queryParams,
            fragment: fragment ?? undefined,
          }),
      },
    ],
  },
  {
    path: 'tin-nhan',
    canActivate: [roleGuard([RoleCode.TENANT, RoleCode.LANDLORD, RoleCode.ADMIN])],
    loadComponent: () =>
      import('@shared/pages/chat/chat-page.component').then((m) => m.ChatPageComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('@features/tenant/landing/pages/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent,
      ),
  },
  {
    path: 'trang-ca-nhan',
    canActivate: [roleGuard([RoleCode.TENANT, RoleCode.LANDLORD, RoleCode.ADMIN])],
    loadComponent: () =>
      import('@shared/pages/profile/pages/profile-page/profile-page.component').then(
        (m) => m.ProfilePageComponent,
      ),
  },
  {
    path: 'quan-ly-loai-phong',
    redirectTo: '/admin/room-types',
    pathMatch: 'full',
  },
  {
    path: 'loai-phong',
    redirectTo: '/admin/room-types',
    pathMatch: 'full',
  },
  {
    path: 'quan-ly-tien-ich',
    redirectTo: '/admin/amenities',
    pathMatch: 'full',
  },
  {
    path: 'tien-ich',
    redirectTo: '/admin/amenities',
    pathMatch: 'full',
  },
  {
    path: 'cai-dat',
    redirectTo: profileRedirect,
    pathMatch: 'full',
  },
  // Compatibility aliases share the same profile page and access rules for every role.
  { path: 'landlord/profile', redirectTo: profileRedirect, pathMatch: 'full' },
  { path: 'admin/profile', redirectTo: profileRedirect, pathMatch: 'full' },
];
