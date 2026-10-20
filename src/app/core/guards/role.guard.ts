import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "@services/auth.service";
import { RoleCode } from "@model/auth/auth.model";

export const roleGuard = (roles: RoleCode[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  if (auth.hasAnyRole(roles)) return true;
  return router.createUrlTree([auth.homeUrl()]);
};
