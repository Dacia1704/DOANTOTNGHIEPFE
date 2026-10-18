import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  // {
  //   path: 'login',
  //   loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  // },
  // {
  //   path: 'reader',
  //   canActivate: [roleGuard(['MEMBER', 'READER'])],
  //   loadComponent: () => import('./layouts/reader-layout/reader-layout').then(m => m.ReaderLayout),
  //   children: [
  //     { path: '', loadChildren: () => import('./features/reader/reader.routes').then(m => m.READER_ROUTES) },
  //   ],
  // },
  // {
  //   path: 'librarian',
  //   canActivate: [roleGuard(['LIBRARIAN'])],
  //   loadComponent: () => import('./layouts/librarian-layout/librarian-layout').then(m => m.LibrarianLayout),
  //   children: [
  //     { path: '', loadChildren: () => import('./features/librarian/librarian.routes').then(m => m.LIBRARIAN_ROUTES) },
  //   ],
  // },
  // {
  //   path: 'admin',
  //   canActivate: [roleGuard(['ADMIN'])],
  //   loadComponent: () => import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
  //   children: [
  //     { path: '', loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  //   ],
  // },
];
