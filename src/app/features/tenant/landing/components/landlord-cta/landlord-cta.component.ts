import { ChangeDetectionStrategy, Component } from '@angular/core';

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
export class LandlordCtaComponent {}
