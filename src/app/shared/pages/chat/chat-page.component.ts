import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  finalize,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { ChatConversation, ChatMessage } from '@model/chat/chat.model';
import { AuthService } from '@services/auth/auth.service';
import { ChatService } from '@services/chat/chat.service';
import { ChatTarget, ChatWidgetService } from '@services/chat/chat-widget.service';
import { RoleCode } from '@model/auth/auth.model';
import { ImageUtils } from '@shared/utils/image-utils';

@Component({
  selector: 'app-chat-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent implements OnInit {
  @Input() compact = false;
  @Input() set target(value: ChatTarget) {
    this.targets.next(value);
  }
  @Input() set active(value: boolean) {
    this.visible = value;
    if (value) {
      this.markRead();
      this.scrollToBottom();
    }
  }
  private visible = true;
  private readonly targets = new BehaviorSubject<ChatTarget>({});
  readonly chat = inject(ChatService);
  readonly auth = inject(AuthService);
  private readonly widget = inject(ChatWidgetService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly selections = new Subject<ChatConversation>();
  private readonly reloads = new Subject<void>();
  private refreshInbox = false;
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
  readonly draft = new FormControl('', { nonNullable: true });
  readonly historyPage = signal(0);
  readonly totalPages = signal(0);

  get canUseSupport(): boolean {
    return this.auth.hasAnyRole([RoleCode.TENANT, RoleCode.LANDLORD]);
  }

  get inboxConversations(): ChatConversation[] {
    return this.conversations().filter((item) => !!item.listing || !this.canUseSupport);
  }

  conversationName(conversation: ChatConversation): string {
    return !conversation.listing && this.canUseSupport
      ? 'Hỗ trợ Trọ Tốt'
      : conversation.otherUser?.fullName || 'Người tham gia';
  }

  ngOnInit(): void {
    this.chat.startRealtime();
    const draftUserId = this.auth.session()?.id;
    this.destroy.onDestroy(() => {
      const id = this.selected()?.id;
      if (id && this.auth.session()?.id === draftUserId)
        this.chat.saveConversationDraft(id, this.draft.value);
      this.chat.stopRealtime();
    });
    this.selections
      .pipe(
        switchMap((conversation) => {
          const previous = this.selected();
          if (previous) this.chat.saveConversationDraft(previous.id, this.draft.value);
          this.selected.set(conversation);
          this.showConversation.set(true);
          this.messages.set([]);
          this.messageError.set('');
          this.loadingMessages.set(true);
          this.totalPages.set(0);
          this.historyPage.set(0);
          const prepared = conversation.listing
            ? this.chat.takeDraft(conversation.listing.id)
            : undefined;
          this.draft.setValue(prepared ?? this.chat.conversationDraft(conversation.id));
          return this.chat.getMessages(conversation.id).pipe(
            catchError((err) => {
              this.messageError.set(
                err?.error?.message || 'Không tải được tin nhắn. Vui lòng thử lại.',
              );
              return EMPTY;
            }),
            finalize(() => this.loadingMessages.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((page) => {
        this.mergeMessages(page.items);
        this.historyPage.set(page.page);
        this.totalPages.set(page.totalPages);
        this.markRead();
        this.scrollToBottom();
      });

    const targets: Observable<ChatTarget> = this.compact
      ? this.targets
      : this.route.queryParamMap.pipe(
          map((params) => ({
            listingId: params.get('listing') ?? undefined,
            conversationId: params.get('conversation') ?? undefined,
            support: params.get('support') === '1',
          })),
        );
    combineLatest([targets, this.reloads.pipe(startWith(undefined))])
      .pipe(
        switchMap(([target]) => {
          const refresh =
            this.refreshInbox ||
            this.conversations().length === 0 ||
            (!!target.conversationId &&
              !this.conversations().some((item) => item.id === target.conversationId));
          this.loading.set(refresh);
          this.error.set('');
          const inbox = refresh
            ? this.chat.getConversations().pipe(tap(() => (this.refreshInbox = false)))
            : of(this.conversations());
          return inbox.pipe(
            switchMap((items) => {
              this.conversations.set(items);
              const listingId = target.listingId;
              return listingId
                ? this.chat.openListing(listingId)
                : target.support
                  ? this.chat.openSupport()
                  : of(
                      items.find((item) => item.id === target.conversationId) ??
                        (this.compact ? null : items[0]) ??
                        null,
                    );
            }),
            catchError((err) => {
              this.error.set(
                err?.error?.message || 'Không mở được cuộc trò chuyện. Vui lòng thử lại.',
              );
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((conversation) => {
        if (!conversation) {
          if (this.compact) this.showConversation.set(false);
          return;
        }
        this.conversations.update((items) =>
          items.some((item) => item.id === conversation.id)
            ? items.map((item) => (item.id === conversation.id ? conversation : item))
            : [conversation, ...items],
        );
        this.selections.next(conversation);
      });

    this.chat.messages$.pipe(takeUntilDestroyed(this.destroy)).subscribe((message) => {
      const active =
        this.visible && this.selected()?.id === message.conversationId && this.showConversation();
      if (this.selected()?.id === message.conversationId) this.mergeMessages([message]);
      if (active) {
        this.markRead();
        this.scrollToBottom();
      }
      if (!this.conversations().some((item) => item.id === message.conversationId)) {
        this.chat
          .getConversations()
          .pipe(takeUntilDestroyed(this.destroy))
          .subscribe({
            next: (items) => this.conversations.set(items),
            error: () => {},
          });
        return;
      }
      this.conversations.update((items) =>
        items
          .map((item) =>
            item.id === message.conversationId
              ? {
                  ...item,
                  lastMessage: message,
                  lastMessageAt: message.createdAt,
                  unreadCount:
                    active || message.sender.id === this.auth.session()?.id
                      ? 0
                      : item.unreadCount + 1,
                }
              : item,
          )
          .sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0)),
      );
    });
  }

  selectConversation(conversation: ChatConversation): void {
    if (conversation.id === this.selected()?.id) {
      this.showConversation.set(true);
      this.markRead();
      return;
    }
    if (this.compact) this.selections.next(conversation);
    else
      void this.router.navigate([this.inboxRoute], {
        queryParams: { conversation: conversation.id },
      });
  }

  openSupport(): void {
    if (!this.canUseSupport) return;
    if (this.compact) this.widget.openSupport();
    else void this.router.navigate([this.inboxRoute], { queryParams: { support: '1' } });
  }

  backToConversations(): void {
    if (this.compact) this.widget.openInbox();
    else this.showConversation.set(false);
  }
  private get inboxRoute(): string {
    return this.auth.primaryRole() === RoleCode.ADMIN ? '/admin/messages' : '/tin-nhan';
  }

  retryMessages(): void {
    const conversation = this.selected();
    if (conversation) this.selections.next(conversation);
  }

  reloadConversations(): void {
    this.refreshInbox = true;
    this.reloads.next();
  }

  loadOlder(): void {
    const id = this.selected()?.id;
    if (!id || this.loadingOlder() || this.historyPage() + 1 >= this.totalPages()) return;
    this.loadingOlder.set(true);
    const element = this.messageList?.nativeElement;
    const height = element?.scrollHeight ?? 0;
    this.chat
      .getMessages(id, this.historyPage() + 1)
      .pipe(
        finalize(() => this.loadingOlder.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (page) => {
          if (this.selected()?.id !== id) return;
          this.mergeMessages(page.items);
          this.historyPage.set(page.page);
          this.totalPages.set(page.totalPages);
          setTimeout(() => {
            if (element) element.scrollTop += element.scrollHeight - height;
          });
        },
        error: (err) => this.messageError.set(err?.error?.message || 'Không tải được tin nhắn cũ.'),
      });
  }

  send(): void {
    const conversation = this.selected();
    const content = this.draft.value.trim();
    if (
      !conversation ||
      !content ||
      content.length > 4000 ||
      this.sending() ||
      this.loadingMessages() ||
      this.messageError() ||
      this.chat.connection() !== 'connected'
    )
      return;
    this.sending.set(true);
    this.error.set('');
    this.chat
      .sendText(conversation.id, content)
      .pipe(
        finalize(() => this.sending.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: () => {
          this.chat.saveConversationDraft(conversation.id, '');
          if (this.selected()?.id === conversation.id && this.draft.value.trim() === content)
            this.draft.setValue('');
        },
        error: (err) =>
          this.error.set(
            err?.name === 'TimeoutError'
              ? 'Chưa nhận được xác nhận gửi tin. Nội dung được giữ lại; kiểm tra cuộc trò chuyện trước khi gửi lại.'
              : err?.message || 'Chưa gửi được tin nhắn. Nội dung được giữ lại để bạn thử lại.',
          ),
      });
  }

  onComposerEnter(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (keyboard.shiftKey || keyboard.isComposing) return;
    keyboard.preventDefault();
    this.send();
  }

  private mergeMessages(items: ChatMessage[]): void {
    this.messages.update((current) =>
      [...new Map([...current, ...items].map((item) => [item.id, item])).values()].sort(
        (a, b) =>
          (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) || a.id.localeCompare(b.id),
      ),
    );
  }

  private markRead(): void {
    if (!this.visible) return;
    const id = this.selected()?.id;
    if (!id) return;
    this.chat
      .markRead(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () =>
          this.conversations.update((items) =>
            items.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)),
          ),
        error: () => {},
      });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const element = this.messageList?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
}
