import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
@Component({
  selector: 'app-billing-pager',
  templateUrl: './billing-pager.component.html',
  styleUrl: './billing-pager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingPagerComponent {
  readonly page = input(0);
  readonly totalPages = input(0);
  readonly disabled = input(false);
  readonly changePage = output<number>();
}
