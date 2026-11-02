import { inject } from '@angular/core';
import { RedirectFunction, Router, Routes } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { RoleCode } from '@model/auth/auth.model';

// Legacy shared URLs select the landlord dashboard only for a landlord session.
const isLandlord = () =>
  inject(AuthService).isLoggedIn() && inject(AuthService).hasAnyRole([RoleCode.LANDLORD]);

const dashboardRedirect =
  (page: string): RedirectFunction =>
  ({ params, queryParams, fragment }) =>
    inject(Router).createUrlTree(
      page === 'agreements' ? ['/landlord/agreements', params['id']] : ['/landlord', page],
      { queryParams, fragment: fragment ?? undefined },
    );

export const LANDLORD_ROUTES: Routes = [
  {
    path: '',
    canMatch: [isLandlord],
    children: [
      { path: 'trang-ca-nhan', redirectTo: dashboardRedirect('profile'), pathMatch: 'full' },
      { path: 'cai-dat', redirectTo: dashboardRedirect('profile'), pathMatch: 'full' },
      { path: 'tin-nhan', redirectTo: dashboardRedirect('messages'), pathMatch: 'full' },
      { path: 'hop-dong/:id', redirectTo: dashboardRedirect('agreements'), pathMatch: 'full' },
    ],
  },
  {
    path: 'quan-ly-dat-phong',
    data: { landlord: true },
    loadComponent: () =>
      import('@shared/pages/rental/rental-list-page.component').then(
        (m) => m.RentalListPageComponent,
      ),
  },
  {
    path: 'goi-dich-vu',
    loadComponent: () =>
      import('@features/landlord/service-package/pages/service-package-page/service-package-page.component').then(
        (m) => m.ServicePackagePageComponent,
      ),
  },
  {
    path: 'boost',
    loadComponent: () =>
      import('@features/landlord/boost/pages/boost-page/boost-page.component').then(
        (m) => m.BoostPageComponent,
      ),
  },
  {
    path: 'tin-cua-toi',
    loadComponent: () =>
      import('@features/landlord/listing/pages/listing-page/listing-page.component').then(
        (m) => m.ListingPageComponent,
      ),
  },
  {
    path: 'lich-su-thanh-toan',
    loadComponent: () =>
      import('@features/landlord/payment/pages/payment-history-page/payment-history-page.component').then(
        (m) => m.PaymentHistoryPageComponent,
      ),
  },
  {
    path: 'thanh-toan/ket-qua',
    loadComponent: () =>
      import('@features/landlord/payment/pages/payment-result-page/payment-result-page.component').then(
        (m) => m.PaymentResultPageComponent,
      ),
  },
  {
    path: 'thanh-toan/xac-nhan/:type/:targetId',
    loadComponent: () =>
      import('@features/landlord/payment/pages/checkout-page/checkout-page.component').then(
        (m) => m.CheckoutPageComponent,
      ),
  },
  {
    path: 'thanh-toan/:paymentId',
    loadComponent: () =>
      import('@features/landlord/payment/pages/payment-result-page/payment-result-page.component').then(
        (m) => m.PaymentResultPageComponent,
      ),
  },
  {
    path: 'phong-cua-toi/tat-ca',
    redirectTo: '/phong-cua-toi',
    pathMatch: 'full',
  },
  {
    path: 'phong-cua-toi',
    loadComponent: () =>
      import('@features/landlord/property/pages/property-management-page/property-management-page.component').then(
        (m) => m.PropertyManagementPageComponent,
      ),
  },
  {
    path: 'dang-tin',
    redirectTo: '/tin-cua-toi',
    pathMatch: 'full',
  },
  {
    path: 'landlord',
    redirectTo: 'phong-cua-toi',
    pathMatch: 'full',
  },
  {
    path: 'danh-sach-phong',
    redirectTo: 'phong-cua-toi',
    pathMatch: 'full',
  },
  {
    path: 'landlord/profile',
    loadComponent: () =>
      import('@shared/pages/profile/pages/profile-page/profile-page.component').then(
        (m) => m.ProfilePageComponent,
      ),
  },
  {
    path: 'landlord/messages',
    loadComponent: () =>
      import('@shared/pages/chat/chat-page.component').then((m) => m.ChatPageComponent),
  },
  {
    path: 'landlord/agreements/:id',
    loadComponent: () =>
      import('@shared/pages/rental/agreement-page.component').then((m) => m.AgreementPageComponent),
  },
];
