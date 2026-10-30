import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BillingUtils } from '@shared/utils/billing-utils';

@Component({
  selector: 'app-billing-status',
  templateUrl: './billing-status.component.html',
  styleUrl: './billing-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingStatusComponent {
  readonly status = input.required<string>();
  readonly label = BillingUtils.label.bind(BillingUtils);
}
