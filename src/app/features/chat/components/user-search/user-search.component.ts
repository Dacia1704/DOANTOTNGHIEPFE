import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of } from 'rxjs';
import { ChatService } from '@services/chat.service';
import { ChatUser } from '@model/chat/chat.model';

@Component({
  selector: 'app-user-search',
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
})
export class UserSearchComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @Output() startChat = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  searchControl = new FormControl('');
  users: ChatUser[] = [];
  loading = false;
  hasSearched = false;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap(val => {
          const query = (val ?? '').trim();
          if (query.length < 2) {
            this.loading = false;
            this.hasSearched = false;
            this.users = [];
            this.cdr.markForCheck();
            return of([]);
          }
          this.loading = true;
          this.hasSearched = true;
          this.cdr.markForCheck();
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: results => {
          this.users = results;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.users = [];
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectUser(user: ChatUser): void {
    this.startChat.emit(user.id);
  }

  getAvatarFallback(name: string): string {
    return (name ?? '?').charAt(0).toUpperCase();
  }
}
