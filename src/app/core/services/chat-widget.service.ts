import { Injectable, signal } from '@angular/core';

export interface ChatTarget {
  listingId?: string;
  conversationId?: string;
  support?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatWidgetService {
  readonly opened = signal(false);
  readonly minimized = signal(false);
  readonly target = signal<ChatTarget>({});

  openInbox(): void {
    this.open({});
  }
  openSupport(): void {
    this.open({ support: true });
  }
  openListing(listingId: string): void {
    this.open({ listingId });
  }
  open(target: ChatTarget): void {
    this.target.set(target);
    this.minimized.set(false);
    this.opened.set(true);
  }
  close(): void {
    this.opened.set(false);
    this.minimized.set(false);
  }
}
