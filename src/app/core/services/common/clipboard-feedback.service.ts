import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Shared clipboard handling and transient feedback for all copy/share actions. */
@Injectable({ providedIn: 'root' })
export class ClipboardFeedbackService {
  private readonly document = inject(DOCUMENT);
  private readonly clipboard = inject(Clipboard);
  private readonly toast = inject(MatSnackBar);

  async copy(
    text: string,
    success = 'Đã sao chép.',
    failure = 'Không thể sao chép. Vui lòng thử lại.',
  ): Promise<boolean> {
    let copied = false;
    if (text.trim()) {
      try {
        const clipboard = this.document.defaultView?.navigator.clipboard;
        if (clipboard) {
          await clipboard.writeText(text);
          copied = true;
        }
      } catch {
        // Some browsers block the async API but still allow copying from a user gesture.
      }
      if (!copied) {
        try {
          copied = this.clipboard.copy(text);
        } catch {
          copied = false;
        }
      }
    }
    this.toast.open(copied ? success : failure, 'Đóng', {
      duration: copied ? 3000 : 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['app-toast', copied ? 'app-toast-success' : 'app-toast-error'],
      politeness: 'polite',
    });
    return copied;
  }
}
