import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';

/**
 * Banner CTA cho chủ trọ (gradient primary → container).
 */
@Component({
  selector: 'app-landlord-cta',
  imports: [],
  templateUrl: './landlord-cta.component.html',
  styleUrl: './landlord-cta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandlordCtaComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  navigateTo(route: string): void {
    if (this.auth.isLoggedIn()) {
      void this.router.navigate(['/' + route]);
    } else {
      void this.router.navigate(['/login'], { queryParams: { redirect: route } });
    }
  }
}
