import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
@Component({
  selector: 'app-confirm-rental',
  imports: [MatDialogModule, FormsModule],
  templateUrl: './confirm-rental-dialog.component.html',
  styleUrl: './confirm-rental-dialog.component.scss',
})
export class ConfirmRentalDialogComponent {
  readonly data = inject<{ title: string; message: string; reason?: boolean }>(MAT_DIALOG_DATA);
  reason = '';
}
