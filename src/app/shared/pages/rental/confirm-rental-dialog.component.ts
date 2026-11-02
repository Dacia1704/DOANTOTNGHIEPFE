import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
@Component({
  selector: 'app-confirm-rental',
  imports: [MatDialogModule, FormsModule],
  template: ` <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content
      ><p>{{ data.message }}</p>
      @if (data.reason) {
        <label
          >Lý do (không bắt buộc)<textarea
            class="input"
            [(ngModel)]="reason"
            maxlength="500"
          ></textarea>
        </label>
      }</mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button class="btn-secondary" [mat-dialog-close]="null">Quay lại</button
      ><button class="btn-primary" [mat-dialog-close]="{ reason }">
        Xác nhận
      </button></mat-dialog-actions
    >`,
})
export class ConfirmRentalDialogComponent {
  readonly data = inject<{ title: string; message: string; reason?: boolean }>(MAT_DIALOG_DATA);
  reason = '';
}
