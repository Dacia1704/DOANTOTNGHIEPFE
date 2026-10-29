import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, finalize, of, startWith, switchMap } from 'rxjs';
import { ChatConversation, ChatMessage } from '@model/chat/chat.model';
import { AuthService } from '@services/auth.service';
import { ChatService } from '@services/chat.service';
import { ImageUtils } from '@shared/utils/image-utils';

@Component({
  selector: 'app-chat-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent implements OnInit {
  readonly chat = inject(ChatService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly selections = new Subject<ChatConversation>();
  private readonly reloads = new Subject<void>();
  private readonly drafts = new Map<string, string>();
  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;
  readonly images = ImageUtils;
  readonly conversations = signal<ChatConversation[]>([]);
  readonly selected = signal<ChatConversation | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(true);
  readonly loadingMessages = signal(false);
  readonly loadingOlder = signal(false);
  readonly showConversation = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly messageError = signal('');
  readonly search = new FormControl('', { nonNullable: true });
  readonly draft = new FormControl('', { nonNullable: true });
  readonly historyPage = signal(0);
  readonly totalPages = signal(0);

  get filteredConversations(): ChatConversation[] {
    const query = this.search.value.trim().toLocaleLowerCase('vi');
    return this.conversations().filter((item) =>
      `${item.otherUser?.fullName ?? 'Hỗ trợ'} ${item.listing?.title ?? 'Hỗ trợ Trọ Tốt'}`
        .toLocaleLowerCase('vi').includes(query));
  }

  ngOnInit(): void {
    this.chat.startRealtime();
    this.destroy.onDestroy(() => this.chat.stopRealtime());
    this.selections.pipe(
      switchMap((conversation) => {
        const previous = this.selected();
        if (previous) this.drafts.set(previous.id, this.draft.value);
        this.selected.set(conversation);
        this.showConversation.set(true);
        this.messages.set([]);
        this.messageError.set('');
        this.loadingMessages.set(true);
        this.totalPages.set(0);
        this.historyPage.set(0);
        const prepared = conversation.listing ? this.chat.takeDraft(conversation.listing.id) : undefined;
        this.draft.setValue(prepared ?? this.drafts.get(conversation.id) ?? '');
        return this.chat.getMessages(conversation.id).pipe(
          catchError((err) => {
            this.messageError.set(err?.error?.message || 'Không tải được tin nhắn. Vui lòng thử lại.');
            return EMPTY;
          }),
          finalize(() => this.loadingMessages.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroy),
    ).subscribe((page) => {
      this.mergeMessages(page.items);
      this.historyPage.set(page.page);
      this.totalPages.set(page.totalPages);
      this.markRead();
      this.scrollToBottom();
    });

    combineLatest([this.route.queryParamMap, this.reloads.pipe(startWith(undefined))]).pipe(
      switchMap(([params]) => {
        this.loading.set(true);
        this.error.set('');
        return this.chat.getConversations().pipe(
          switchMap((items) => {
            this.conversations.set(items);
            const listingId = params.get('listing');
            const target = listingId ? this.chat.openListing(listingId)
              : params.get('support') === '1' ? this.chat.openSupport()
              : of(items.find((item) => item.id === params.get('conversation')) ?? items[0] ?? null);
            return target;
          }),
          catchError((err) => {
            this.error.set(err?.error?.message || 'Không mở được cuộc trò chuyện. Vui lòng thử lại.');
            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroy),
    ).subscribe((conversation) => {
      if (!conversation) return;
      this.conversations.update((items) => [conversation, ...items.filter((item) => item.id !== conversation.id)]);
      this.selections.next(conversation);
    });

    this.chat.messages$.pipe(takeUntilDestroyed(this.destroy)).subscribe((message) => {
      const active = this.selected()?.id === message.conversationId && this.showConversation();
      if (active) {
        this.mergeMessages([message]);
        this.markRead();
        this.scrollToBottom();
      }
      if (!this.conversations().some((item) => item.id === message.conversationId)) {
        this.chat.getConversations().pipe(takeUntilDestroyed(this.destroy)).subscribe({
          next: (items) => this.conversations.set(items), error: () => {},
        });
        return;
      }
      this.conversations.update((items) => items.map((item) => item.id === message.conversationId
        ? { ...item, lastMessage: message, lastMessageAt: message.createdAt,
            unreadCount: active || message.sender.id === this.auth.session()?.id ? 0 : item.unreadCount + 1 }
        : item).sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0)));
    });
  }

  selectConversation(conversation: ChatConversation): void {
    if (conversation.id === this.selected()?.id) {
      this.showConversation.set(true);
      this.markRead();
      return;
    }
    void this.router.navigate(['/tin-nhan'], { queryParams: { conversation: conversation.id } });
  }

  retryMessages(): void {
    const conversation = this.selected();
    if (conversation) this.selections.next(conversation);
  }

  reloadConversations(): void { this.reloads.next(); }

  loadOlder(): void {
    const id = this.selected()?.id;
    if (!id || this.loadingOlder() || this.historyPage() + 1 >= this.totalPages()) return;
    this.loadingOlder.set(true);
    const element = this.messageList?.nativeElement;
    const height = element?.scrollHeight ?? 0;
    this.chat.getMessages(id, this.historyPage() + 1).pipe(
      finalize(() => this.loadingOlder.set(false)), takeUntilDestroyed(this.destroy),
    ).subscribe({
      next: (page) => {
        if (this.selected()?.id !== id) return;
        this.mergeMessages(page.items);
        this.historyPage.set(page.page);
        this.totalPages.set(page.totalPages);
        setTimeout(() => { if (element) element.scrollTop += element.scrollHeight - height; });
      },
      error: (err) => this.messageError.set(err?.error?.message || 'Không tải được tin nhắn cũ.'),
    });
  }

  send(): void {
    const conversation = this.selected();
    const content = this.draft.value.trim();
    if (!conversation || !content || this.sending() || this.loadingMessages() || this.messageError()) return;
    this.sending.set(true);
    this.error.set('');
    this.chat.sendText(conversation.id, content).pipe(
      finalize(() => this.sending.set(false)), takeUntilDestroyed(this.destroy),
    ).subscribe({
      next: () => {
        this.drafts.delete(conversation.id);
        if (this.selected()?.id === conversation.id && this.draft.value.trim() === content) this.draft.setValue('');
      },
      error: () => this.error.set('Chưa nhận được xác nhận gửi tin. Nội dung được giữ lại; kiểm tra cuộc trò chuyện trước khi gửi lại.'),
    });
  }

  private mergeMessages(items: ChatMessage[]): void {
    this.messages.update((current) => [...new Map([...current, ...items].map((item) => [item.id, item])).values()]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)));
  }

  private markRead(): void {
    const id = this.selected()?.id;
    if (!id) return;
    this.chat.markRead(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => this.conversations.update((items) => items.map((item) => item.id === id ? { ...item, unreadCount: 0 } : item)),
      error: () => {},
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => { const element = this.messageList?.nativeElement; if (element) element.scrollTop = element.scrollHeight; });
  }
}
