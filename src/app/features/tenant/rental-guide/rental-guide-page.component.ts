import { ChangeDetectionStrategy, Component, ElementRef, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RoleCode } from '@model/auth/auth.model';
import { AuthService } from '@services/auth/auth.service';

@Component({
  selector: 'app-rental-guide-page',
  imports: [RouterLink],
  templateUrl: './rental-guide-page.component.html',
  styleUrl: './rental-guide-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalGuidePageComponent {
  private readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly isLandlord = computed(() => this.auth.primaryRole() === RoleCode.LANDLORD);
  readonly pageTitle = computed(() =>
    this.isLandlord() ? 'Cẩm nang thuê / cho thuê trọ' : 'Cẩm nang thuê trọ',
  );
  readonly sections = computed(() => [
    { id: 'nhu-cau', title: 'Bắt đầu từ nhu cầu của bạn' },
    { id: 'xem-phong', title: 'Đi xem phòng, nhìn kỹ hơn' },
    { id: 'chi-phi', title: 'Làm rõ từng khoản chi phí' },
    { id: 'thoa-thuan', title: 'Thống nhất trước khi dọn vào' },
    { id: 'ban-giao', title: 'Một lần bàn giao thật rõ ràng' },
    ...(this.isLandlord() ? [{ id: 'cho-thue', title: 'Dành cho người cho thuê' }] : []),
  ]);

  scrollToSection(event: MouseEvent, id: string): void {
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
