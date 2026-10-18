import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { catchError, Observable, shareReplay, switchMap, throwError } from 'rxjs';

let isRefreshing = false;
let refreshSub$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthUrl = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  const withToken = (token: string | null) =>
    token && !isAuthUrl ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(auth.accessToken)).pipe(
    catchError(err => {
      if (err.status === 401 && !isAuthUrl && auth.refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshSub$ = auth.refresh().pipe(
            shareReplay(1),
            catchError(e => {
              isRefreshing = false;
              auth.clearSession();
              return throwError(() => e);
            }),
            switchMap(() => {
              isRefreshing = false;
              return [auth.accessToken!];
            }),
          );
        }
        return refreshSub$!.pipe(
          switchMap(token => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })))
        );
      }
      return throwError(() => err);
    })
  );
};
