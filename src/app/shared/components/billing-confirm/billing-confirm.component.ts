import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
export interface BillingConfirmData {
  title: string;
  message: string;
  action: string;
}
@Component({
  selector: 'app-billing-confirm',
  imports: [MatDialogModule],
  templateUrl: './billing-confirm.component.html',
  styleUrl: './billing-confirm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingConfirmComponent {
  readonly data = inject<BillingConfirmData>(MAT_DIALOG_DATA);
}
