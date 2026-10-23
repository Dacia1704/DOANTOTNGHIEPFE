import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: 'wards', loadComponent: () => import('./ward-management/ward-management.component').then(m => m.WardManagementComponent) },
  { path: 'users', loadComponent: () => import('./user-management/user-management.component').then(m => m.UserManagementComponent) },
  { path: 'profile', loadComponent: () => import('../profile/pages/profile-page/profile-page.component').then(m => m.ProfilePageComponent) },
  { path: 'rooms', redirectTo: '/phong-cua-toi', pathMatch: 'full' },
  { path: 'room-types', redirectTo: '/quan-ly-loai-phong', pathMatch: 'full' },
  { path: 'amenities', redirectTo: '/quan-ly-tien-ich', pathMatch: 'full' },
  { path: '', pathMatch: 'full', redirectTo: 'users' },
];

