import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { UserStatus } from '@model/auth/auth.model';
import { UserManagementComponent } from './user-management/user-management.component';
import { WardManagementComponent } from './ward-management/ward-management.component';
import { AmenityManagementComponent } from './amenity-management/amenity-management.component';
import { PropertyTypeManagementComponent } from './property-type-management/property-type-management.component';
import { RoomTypeManagementComponent } from './room-type-management/room-type-management.component';
import { BillingCatalogComponent } from './billing-catalog/billing-catalog.component';

registerLocaleData(localeVi);

describe('admin shared management tables', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/service-packages', component: BillingCatalogComponent }]),
        { provide: MatDialog, useValue: {} },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function flushPage(path: string, page: number, size: number, data: unknown[], total = 35) {
    const request = http.expectOne((request) => request.url.endsWith(path));
    expect(request.request.params.get('page')).toBe(String(page));
    expect(request.request.params.get('size')).toBe(String(size));
    request.flush({
      data: {
        data,
        currentPage: page,
        pageSize: size,
        totalPages: Math.ceil(total / size),
        totalElements: total,
      },
    });
  }
  function size(element: HTMLElement, size: string) {
    const select = element.querySelector<HTMLSelectElement>('.page-size select')!;
    select.value = size;
    select.dispatchEvent(new Event('change'));
  }
  function button(element: HTMLElement, name: string) {
    return [...element.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === name,
    )!;
  }

  it('keeps applied user filters on page-size changes and forwards row actions', () => {
    const fixture = TestBed.createComponent(UserManagementComponent);
    const user = {
      id: 'u',
      fullName: 'Nguyễn A',
      email: 'a@example.com',
      status: 'ACTIVE',
      roles: ['LANDLORD'],
    };
    flushPage('/users', 0, 10, [user]);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.management-table .table-toolbar form')).not.toBeNull();
    const action = vi.spyOn(page, 'openAction').mockImplementation(() => {});
    button(element, 'Sửa').click();
    button(element, 'Xóa').click();
    expect(action).toHaveBeenCalledWith(page.result()!.items[0], 'edit');
    expect(action).toHaveBeenCalledWith(page.result()!.items[0], 'delete');
    page.filters.setValue({ q: 'Nguyễn', status: UserStatus.ACTIVE });
    page.search();
    const filtered = http.expectOne((request) => request.url.endsWith('/users'));
    expect(filtered.request.params.get('q')).toBe('Nguyễn');
    expect(filtered.request.params.get('status')).toBe('ACTIVE');
    filtered.flush({ data: { data: [user], currentPage: 0, totalPages: 4, totalElements: 35 } });
    fixture.detectChanges();
    size(element, '20');
    const resized = http.expectOne((request) => request.url.endsWith('/users'));
    expect(resized.request.params.get('q')).toBe('Nguyễn');
    expect(resized.request.params.get('size')).toBe('20');
    expect(resized.request.params.get('page')).toBe('0');
    resized.flush({ data: { data: [user], currentPage: 0, totalPages: 2, totalElements: 35 } });
  });

  it('keeps ward province filters when switching size and paging', () => {
    const fixture = TestBed.createComponent(WardManagementComponent);
    http
      .expectOne((request) => request.url.endsWith('/provinces'))
      .flush({ data: [{ id: 'p', name: 'Hà Nội' }] });
    const ward = {
      id: 'w',
      code: '001',
      name: 'Phường A',
      provinceName: 'Hà Nội',
      provinceId: 'p',
    };
    flushPage('/wards', 0, 10, [ward]);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.filters.patchValue({ provinceId: 'p' });
    page.search();
    flushPage('/wards', 0, 10, [ward]);
    fixture.detectChanges();
    size(fixture.nativeElement, '5');
    const resized = http.expectOne((request) => request.url.endsWith('/wards'));
    expect(resized.request.params.get('provinceId')).toBe('p');
    expect(resized.request.params.get('size')).toBe('5');
    resized.flush({ data: { data: [ward], currentPage: 0, totalPages: 7, totalElements: 35 } });
    fixture.detectChanges();
    button(fixture.nativeElement, 'Trang sau').click();
    flushPage('/wards', 1, 5, [ward]);
    fixture.detectChanges();
    expect(page.result()?.currentPage).toBe(1);
  });

  it('keeps amenity search and edit/delete actions with server pagination', () => {
    const fixture = TestBed.createComponent(AmenityManagementComponent);
    const amenity = { id: 'a', name: 'Wifi', icon: 'wifi' };
    flushPage('/amenities', 0, 10, [amenity]);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const edit = vi.spyOn(page, 'openEdit').mockImplementation(() => {});
    const remove = vi.spyOn(page, 'openDelete').mockImplementation(() => {});
    fixture.nativeElement.querySelector('[aria-label="Chỉnh sửa tiện ích Wifi"]').click();
    fixture.nativeElement.querySelector('[aria-label="Xóa tiện ích Wifi"]').click();
    expect(edit).toHaveBeenCalledWith(page.result()!.items[0]);
    expect(remove).toHaveBeenCalledWith(page.result()!.items[0]);
    size(fixture.nativeElement, '20');
    flushPage('/amenities', 0, 20, [amenity]);
    fixture.detectChanges();
    page.searchControl.setValue('không tồn tại');
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Không tìm thấy tiện ích nào phù hợp');
  });

  it('retains the property-type editor and delete confirmation beside the shared table', () => {
    const fixture = TestBed.createComponent(PropertyTypeManagementComponent);
    fixture.detectChanges();
    const type = { id: 't', name: 'Nhà trọ', description: 'Cho thuê từng phòng' };
    flushPage('/property-types', 0, 10, [type]);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Sửa Nhà trọ"]').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.name.value).toBe('Nhà trọ');
    fixture.nativeElement.querySelector('[aria-label="Xóa Nhà trọ"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.editor-panel').textContent).toContain(
      'Xác nhận xóa',
    );
    size(fixture.nativeElement, '5');
    flushPage('/property-types', 0, 5, [type]);
  });

  it('keeps room types in the expandable tree with parent/child actions', () => {
    const fixture = TestBed.createComponent(RoomTypeManagementComponent);
    const records = Array.from({ length: 23 }, (_, index) => ({
      id: String(index),
      name: `Loại ${index}`,
      parentId: index ? '0' : null,
      parentName: index ? 'Loại 0' : '',
      description: '',
    }));
    flushPage('/room-types/filter', 0, 100, records, 23);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-room-type-tree')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-management-table')).toBeNull();
    const create = vi.spyOn(fixture.componentInstance, 'openCreate').mockImplementation(() => {});
    const edit = vi.spyOn(fixture.componentInstance, 'openEdit').mockImplementation(() => {});
    const remove = vi.spyOn(fixture.componentInstance, 'openDelete').mockImplementation(() => {});
    fixture.nativeElement.querySelector('[aria-label="Thêm loại con của Loại 0"]').click();
    fixture.nativeElement.querySelector('[aria-label="Chỉnh sửa loại phòng Loại 0"]').click();
    fixture.nativeElement.querySelector('[aria-label="Xóa loại phòng Loại 0"]').click();
    expect(create).toHaveBeenCalledWith(fixture.componentInstance.result()!.items[0]);
    expect(edit).toHaveBeenCalledWith(fixture.componentInstance.result()!.items[0]);
    expect(remove).toHaveBeenCalledWith(fixture.componentInstance.result()!.items[0]);
    const toggle = fixture.nativeElement.querySelector('.toggle') as HTMLButtonElement;
    const expanded = toggle.getAttribute('aria-expanded');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).not.toBe(expanded);
  });

  it('switches service/Boost catalogs through tabs and paginates the chosen API', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/admin/service-packages', BillingCatalogComponent);
    const service = {
      id: 'free',
      code: 'FREE',
      name: 'Miễn phí',
      active: true,
      maxListings: 5,
      highPrioritySlots: 0,
      lowPrioritySlots: 0,
    };
    flushPage('/service-packages', 0, 10, [service]);
    harness.detectChanges();
    expect(
      harness.routeNativeElement!.querySelectorAll('nav[aria-label="Loại gói"] a'),
    ).toHaveLength(2);
    await TestBed.inject(Router).navigateByUrl('/admin/service-packages?tab=boost');
    const boost = {
      id: 'boost',
      name: 'Boost tháng',
      active: true,
      price: 150000,
      durationMonths: 1,
      highPrioritySlots: 2,
      lowPrioritySlots: 3,
    };
    flushPage('/boost-packages', 0, 10, [boost]);
    harness.detectChanges();
    expect(page.kind).toBe('boost');
    expect(harness.routeNativeElement!.querySelector('tbody')?.textContent).toContain(
      'Boost tháng',
    );
    size(harness.routeNativeElement!, '5');
    flushPage('/boost-packages', 0, 5, [boost]);
    harness.detectChanges();
    button(harness.routeNativeElement!, 'Trang sau').click();
    flushPage('/boost-packages', 1, 5, [boost]);
    harness.detectChanges();
    expect(page.page()).toBe(1);
  });
});
