import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    data: { purpose: 'password' },
    loadComponent: () =>
      import('@features/auth/otp/otp-page.component').then((m) => m.OtpPageComponent),
  },
  {
    path: 'verify-email',
    data: { purpose: 'email' },
    loadComponent: () =>
      import('@features/auth/otp/otp-page.component').then((m) => m.OtpPageComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
];
