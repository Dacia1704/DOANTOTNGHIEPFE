import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PackagesPageComponent } from './packages-page.component';
import { ServicePackagePageComponent } from '../service-package/pages/service-package-page/service-package-page.component';
import { BoostPageComponent } from '../boost/pages/boost-page/boost-page.component';
import { LANDLORD_ROUTES } from '../landlord.routes';

@Component({ selector: 'app-service-package-page', template: 'Service content' })
class ServiceStub {
  readonly embedded = input(false);
}
@Component({ selector: 'app-boost-page', template: 'Boost content' })
class BoostStub {
  readonly embedded = input(false);
}

describe('combined landlord package page', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          LANDLORD_ROUTES.filter((route) => ['goi-dich-vu', 'boost'].includes(route.path ?? '')),
        ),
      ],
    });
    TestBed.overrideComponent(PackagesPageComponent, {
      remove: { imports: [ServicePackagePageComponent, BoostPageComponent] },
      add: { imports: [ServiceStub, BoostStub] },
    });
  });

  it('loads two top-level tabs lazily and preserves their content on switching', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/goi-dich-vu', PackagesPageComponent);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const element = harness.routeNativeElement!;
    expect(element.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(element.querySelector('app-service-package-page')).not.toBeNull();
    expect(element.querySelector('app-boost-page')).toBeNull();
    const service = element.querySelector('app-service-package-page');
    page.selectTab(1);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/goi-dich-vu?tab=boost');
    expect(element.querySelector('app-boost-page')).not.toBeNull();
    page.selectTab(0);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(element.querySelector('app-service-package-page')).toBe(service);
  });

  it('opens legacy Boost links in the Boost tab while retaining query and fragment', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      '/boost?source=payment#history',
      PackagesPageComponent,
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/goi-dich-vu?source=payment&tab=boost#history');
    expect(page.selectedTab()).toBe(1);
    expect(harness.routeNativeElement!.querySelector('app-boost-page')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('app-service-package-page')).toBeNull();
    await harness.navigateByUrl('/goi-dich-vu', PackagesPageComponent);
    expect(page.selectedTab()).toBe(0);
  });
});
