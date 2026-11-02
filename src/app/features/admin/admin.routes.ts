import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'messages',
    loadComponent: () =>
      import('@shared/pages/chat/chat-page.component').then((m) => m.ChatPageComponent),
  },
  {
    path: 'property-types',
    loadComponent: () =>
      import('./property-type-management/property-type-management.component').then(
        (m) => m.PropertyTypeManagementComponent,
      ),
  },
  {
    path: 'service-packages',
    data: { catalog: 'service' },
    loadComponent: () =>
      import('./billing-catalog/billing-catalog.component').then((m) => m.BillingCatalogComponent),
  },
  {
    path: 'boost-packages',
    pathMatch: 'full',
    redirectTo: ({ queryParams, fragment }) =>
      inject(Router).createUrlTree(['/admin/service-packages'], {
        queryParams: { ...queryParams, tab: 'boost' },
        fragment: fragment ?? undefined,
      }),
  },
  {
    path: 'subscription-orders',
    loadComponent: () =>
      import('./billing-operations/billing-operations.component').then(
        (m) => m.BillingOperationsComponent,
      ),
  },
  {
    path: 'payments',
    pathMatch: 'full',
    loadComponent: () =>
      import('./payment-management/payment-management.component').then(
        (m) => m.PaymentManagementComponent,
      ),
  },
  {
    path: 'payment-review',
    pathMatch: 'full',
    redirectTo: () =>
      inject(Router).createUrlTree(['/admin/payments'], { queryParams: { tab: 'review' } }),
  },
  {
    path: 'payments/:paymentId',
    loadComponent: () =>
      import('../landlord/payment/pages/payment-result-page/payment-result-page.component').then(
        (m) => m.PaymentResultPageComponent,
      ),
  },
  {
    path: 'listings',
    data: { admin: true },
    loadComponent: () =>
      import('../landlord/listing/pages/listing-page/listing-page.component').then(
        (m) => m.ListingPageComponent,
      ),
  },
  {
    path: 'wards',
    loadComponent: () =>
      import('./ward-management/ward-management.component').then((m) => m.WardManagementComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./user-management/user-management.component').then((m) => m.UserManagementComponent),
  },
  { path: 'rooms', redirectTo: 'listings', pathMatch: 'full' },
  {
    path: 'room-types',
    loadComponent: () =>
      import('./room-type-management/room-type-management.component').then(
        (m) => m.RoomTypeManagementComponent,
      ),
  },
  {
    path: 'amenities',
    loadComponent: () =>
      import('./amenity-management/amenity-management.component').then(
        (m) => m.AmenityManagementComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'users' },
];
