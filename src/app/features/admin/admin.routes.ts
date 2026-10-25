import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: 'service-packages', data: { catalog: 'service' }, loadComponent: () => import('./billing-catalog/billing-catalog.component').then(m => m.BillingCatalogComponent) },
  { path: 'boost-packages', data: { catalog: 'boost' }, loadComponent: () => import('./billing-catalog/billing-catalog.component').then(m => m.BillingCatalogComponent) },
  { path: 'subscription-orders', loadComponent: () => import('./billing-operations/billing-operations.component').then(m => m.BillingOperationsComponent) },
  { path: 'payment-review', data: { review: true }, loadComponent: () => import('./billing-operations/billing-operations.component').then(m => m.BillingOperationsComponent) },
  { path: 'payments/:paymentId', loadComponent: () => import('../payment/pages/payment-result-page/payment-result-page.component').then(m => m.PaymentResultPageComponent) },
  { path: 'listings', data: { admin: true }, loadComponent: () => import('../listing/pages/listing-page/listing-page.component').then(m => m.ListingPageComponent) },
  { path: 'wards', loadComponent: () => import('./ward-management/ward-management.component').then(m => m.WardManagementComponent) },
  { path: 'users', loadComponent: () => import('./user-management/user-management.component').then(m => m.UserManagementComponent) },
  { path: 'profile', loadComponent: () => import('../profile/pages/profile-page/profile-page.component').then(m => m.ProfilePageComponent) },
  { path: 'rooms', redirectTo: '/phong-cua-toi', pathMatch: 'full' },
  { path: 'room-types', loadComponent: () => import('./room-type-management/room-type-management.component').then(m => m.RoomTypeManagementComponent) },
  { path: 'amenities', loadComponent: () => import('./amenity-management/amenity-management.component').then(m => m.AmenityManagementComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'users' },
];

