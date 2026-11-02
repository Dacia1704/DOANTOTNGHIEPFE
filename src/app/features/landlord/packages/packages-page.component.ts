import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ServicePackagePageComponent } from '../service-package/pages/service-package-page/service-package-page.component';
import { BoostPageComponent } from '../boost/pages/boost-page/boost-page.component';

@Component({
  selector: 'app-packages-page',
  imports: [MatTabsModule, RouterLink, ServicePackagePageComponent, BoostPageComponent],
  templateUrl: './packages-page.component.html',
  styleUrl: './packages-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackagesPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly selectedTab = signal(this.route.snapshot.queryParamMap.get('tab') === 'boost' ? 1 : 0);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.selectedTab.set(params.get('tab') === 'boost' ? 1 : 0);
    });
  }

  selectTab(index: number): void {
    if (index === this.selectedTab()) return;
    this.selectedTab.set(index);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index === 1 ? 'boost' : null },
      queryParamsHandling: 'merge',
    });
  }
}
