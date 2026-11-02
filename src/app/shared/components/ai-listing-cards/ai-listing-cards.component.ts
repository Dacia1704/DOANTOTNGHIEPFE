import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AiListingItem } from '@model/ai/ai.model';

@Component({
  selector: 'app-ai-listing-cards',
  imports: [DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cards">
      @for (item of items; track item.id) {
        <a [routerLink]="['/tro', item.id]" (click)="selected.emit(item.id)" class="card">
          <span class="type">{{ item.room_type_name || 'Phòng cho thuê' }}</span>
          <strong>{{ item.title }}</strong>
          <span>{{ item.ward_name }} · {{ item.area_m2 | number:'1.0-1' }} m²</span>
          <span class="price">{{ item.price | number:'1.0-0' }} đ/tháng</span>
          <span class="amenities">{{ item.amenities.join(' · ') }}</span>
          <span class="details">Xem tin đăng →</span>
        </a>
      }
    </div>
  `,
  styles: [`
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr)); gap:12px; }
    .card { display:flex; flex-direction:column; gap:8px; padding:18px; border:1px solid var(--outline-variant,#ddd);
      border-radius:16px; text-decoration:none; color:var(--on-surface,#202523); background:var(--surface,#fff); }
    .card:hover,.card:focus-visible { border-color:var(--primary,#297454); }
    .type,.amenities { font-size:12px; color:var(--on-surface-variant,#56635c); }
    .price,.details { color:var(--primary,#297454); font-weight:600; }
    .details { font-size:13px; margin-top:auto; }
  `],
})
export class AiListingCardsComponent {
  @Input() items: AiListingItem[] = [];
  @Output() selected = new EventEmitter<string>();
}
