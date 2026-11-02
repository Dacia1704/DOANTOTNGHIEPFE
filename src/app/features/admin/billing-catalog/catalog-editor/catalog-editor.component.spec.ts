import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, defer, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ServicePackageService } from '@services/service-package.service';
import { BoostService } from '@services/boost.service';
import { PriceOption, ServicePackage } from '@model/billing/billing.model';
import { SavePackageRequest, SavePriceRequest } from '@model/billing/request/billing-request';
import { CatalogEditorComponent, CatalogEditorData } from './catalog-editor.component';
import { BillingCatalogComponent } from '../billing-catalog.component';

const pkg: ServicePackage = {
  id: 'package',
  code: 'PAID',
  name: 'Gói trả phí',
  maxListings: 3,
  highPrioritySlots: 0,
  lowPrioritySlots: 0,
  defaultPriorityLevel: 0,
  hasStats: false,
  active: true,
  createdAt: null,
  updatedAt: null,
};
const price = (months: number, amount: number, active = true): PriceOption => ({
  id: `price-${months}`,
  packageId: pkg.id,
  durationMonths: months,
  price: amount,
  active,
});

describe('Unified package and pricing editor', () => {
  function setup(data: CatalogEditorData = { kind: 'service' }, initialPrices: PriceOption[] = []) {
    let stored = initialPrices.map((item) => ({ ...item }));
    const events: string[] = [];
    const api = {
      prices: vi.fn((_id: string, _admin: boolean): Observable<PriceOption[]> => of([...stored])),
      save: vi.fn((body: SavePackageRequest, id?: string) => {
        events.push(`package:${id ?? 'new'}:${body.active}`);
        return of({ ...pkg, ...body, id: id ?? 'created' });
      }),
      savePrice: vi.fn(
        (packageId: string, body: SavePriceRequest, id?: string): Observable<PriceOption> =>
          defer(() => {
            events.push(`price:${body.durationMonths}:${body.active}`);
            const saved = { ...body, id: id ?? `price-${body.durationMonths}`, packageId };
            stored = [...stored.filter((item) => item.id !== saved.id), saved];
            return of(saved);
          }),
      ),
      status: vi.fn((id: string, active: boolean) => {
        events.push(`status:${active}`);
        return of({ ...pkg, id, active });
      }),
    };
    const ref = { close: vi.fn(), disableClose: false };
    const boosts = { save: vi.fn(() => of({ id: 'boost' })) };
    TestBed.configureTestingModule({
      imports: [CatalogEditorComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
        { provide: ServicePackageService, useValue: api },
        { provide: BoostService, useValue: boosts },
      ],
    });
    const fixture = TestBed.createComponent(CatalogEditorComponent);
    const editor = fixture.componentInstance;
    if (!data.item) editor.form.patchValue({ code: 'PAID', name: 'Gói trả phí' });
    return { fixture, editor, api, boosts, ref, events };
  }

  it('creates the package and all selected prices in one submission, activating only after prices succeed', () => {
    const { editor, api, ref, events } = setup();
    editor.priceRows.at(0).controls.price.setValue(100000);
    editor.addPrice(3, 250000);
    editor.save();
    expect(events).toEqual(['package:new:false', 'price:1:true', 'price:3:true', 'status:true']);
    expect(api.save.mock.calls[0][0]).not.toHaveProperty('prices');
    expect(ref.close).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('does not activate a package saved as stopped, while retaining its configured durations', () => {
    const { editor, api } = setup();
    editor.form.controls.active.setValue(false);
    editor.priceRows.at(0).controls.price.setValue(100000);
    editor.save();
    expect(api.savePrice).toHaveBeenCalledWith(
      'created',
      { durationMonths: 1, price: 100000, active: true },
      undefined,
    );
    expect(api.status).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions while saving and waits for prices before closing', () => {
    const { editor, api, ref } = setup();
    const pending = new Subject<PriceOption>();
    api.savePrice.mockReturnValueOnce(pending);
    editor.priceRows.at(0).controls.price.setValue(100000);
    editor.save();
    editor.save();
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(editor.busy()).toBe(true);
    expect(ref.disableClose).toBe(true);
    expect(api.status).not.toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
    pending.next(price(1, 100000));
    pending.complete();
    expect(ref.close).toHaveBeenCalledWith(true);
  });

  it('retries a partially saved creation using the existing package and already saved price IDs', () => {
    const { editor, api, ref } = setup();
    editor.priceRows.at(0).controls.price.setValue(100000);
    editor.addPrice(3, 250000);
    const savePrice = api.savePrice.getMockImplementation()!;
    api.savePrice.mockImplementation((id, body, priceId) =>
      body.durationMonths === 3
        ? throwError(() => ({ error: { message: 'Lưu giá thất bại' } }))
        : savePrice(id, body, priceId),
    );
    editor.save();
    expect(ref.close).not.toHaveBeenCalled();
    expect(editor.error()).toContain('Một phần thay đổi đã được lưu');
    expect(editor.busy()).toBe(false);
    expect(api.status).not.toHaveBeenCalled();
    api.savePrice.mockImplementation(savePrice);
    editor.save();
    expect(api.save.mock.calls.map((call) => call[1])).toEqual([undefined, 'created']);
    expect(api.savePrice.mock.calls.filter((call) => call[1].durationMonths === 1)).toHaveLength(1);
    expect(ref.close).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('reuses an old inactive price when a duration is added again', () => {
    const { editor, api } = setup({ kind: 'service', item: pkg }, [
      price(1, 100000),
      price(3, 250000, false),
    ]);
    expect(editor.priceRows.length).toBe(1);
    editor.addPrice();
    expect(editor.priceRows.at(1).getRawValue()).toEqual({ durationMonths: 3, price: 250000 });
    editor.save();
    expect(api.savePrice).toHaveBeenCalledExactlyOnceWith(
      'package',
      { durationMonths: 3, price: 250000, active: true },
      'price-3',
    );
  });

  it('withdraws a removed duration from new purchases while preserving its existing record', () => {
    const { editor, api } = setup({ kind: 'service', item: pkg }, [
      price(1, 100000),
      price(3, 250000),
    ]);
    editor.removePrice(1);
    editor.save();
    expect(api.savePrice).toHaveBeenCalledExactlyOnceWith(
      'package',
      { durationMonths: 3, price: 250000, active: false },
      'price-3',
    );
  });

  it('blocks invalid, missing, or duplicate prices before creating anything', () => {
    const { editor, api } = setup();
    for (const amount of [null, -1, 0.001, 10000000000]) {
      editor.priceRows.at(0).controls.price.setValue(amount);
      editor.save();
    }
    editor.priceRows.at(0).controls.price.setValue(100000);
    editor.addPrice(3, 250000);
    editor.priceRows.at(1).controls.durationMonths.setValue(1);
    editor.save();
    expect(api.save).not.toHaveBeenCalled();
    expect(editor.error()).toContain('Mỗi thời hạn chỉ được thêm một lần');
    editor.priceRows.clear();
    editor.save();
    expect(api.save).not.toHaveBeenCalled();
  });

  it('offers row editing and a single package sale status without per-price sale switches', () => {
    const { fixture, editor } = setup();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.price-row')).toHaveLength(1);
    expect(root.querySelector('.remove-price')?.hasAttribute('disabled')).toBe(true);
    (root.querySelector('.add-price') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.price-row')).toHaveLength(2);
    expect(root.querySelectorAll('[formcontrolname="active"]')).toHaveLength(1);
    expect(root.querySelector('.price-rows [formcontrolname="active"]')).toBeNull();
    (root.querySelector('.remove-price') as HTMLButtonElement).click();
    expect(editor.priceRows.length).toBe(1);
  });

  it('blocks saving until existing prices can be loaded and allows retry', () => {
    const { editor, api, fixture } = setup({ kind: 'service', item: pkg }, [price(1, 100000)]);
    api.prices.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    editor.loadPrices();
    fixture.detectChanges();
    expect(editor.priceLoadFailed()).toBe(true);
    editor.save();
    expect(api.save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    editor.loadPrices();
    editor.save();
    expect(api.save).toHaveBeenCalledOnce();
  });

  it('keeps Free free and saves only its editable name without requesting prices', () => {
    const { editor, api } = setup({ kind: 'service', item: { ...pkg, code: 'FREE' } });
    editor.form.controls.name.setValue('Miễn phí');
    editor.save();
    expect(api.prices).not.toHaveBeenCalled();
    expect(api.savePrice).not.toHaveBeenCalled();
    expect(api.save).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FREE', name: 'Miễn phí', active: true }),
      'package',
    );
  });

  it('preserves the single-price Boost flow', () => {
    const { editor, boosts, api } = setup({ kind: 'boost' });
    editor.form.patchValue({ highPrioritySlots: 1, durationMonths: 3, price: 250000 });
    editor.save();
    expect(boosts.save).toHaveBeenCalledWith(
      expect.objectContaining({ durationMonths: 3, price: 250000 }),
      undefined,
    );
    expect(api.save).not.toHaveBeenCalled();
    expect(api.prices).not.toHaveBeenCalled();
  });
});

describe('Package sale controls', () => {
  function setup(prices: PriceOption[] | null = []) {
    const stopped = { ...pkg, active: false };
    const api = {
      list: () => of({ items: [stopped], page: 0, totalPages: 1, total: 1 }),
      prices: () => (prices === null ? throwError(() => ({ status: 500 })) : of(prices)),
      status: vi.fn(() => of(pkg)),
    };
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(undefined) })) };
    TestBed.configureTestingModule({
      imports: [BillingCatalogComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { catalog: 'service' } } } },
        { provide: ServicePackageService, useValue: api },
        { provide: BoostService, useValue: {} },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    const fixture = TestBed.createComponent(BillingCatalogComponent);
    return { fixture, catalog: fixture.componentInstance, api, dialog, stopped };
  }

  it('opens the unified editor instead of enabling a stopped package without any usable price', () => {
    const { catalog, dialog, api, stopped } = setup();
    catalog.toggle(stopped);
    expect(dialog.open).toHaveBeenCalledWith(
      CatalogEditorComponent,
      expect.objectContaining({ data: { kind: 'service', item: stopped } }),
    );
    expect(api.status).not.toHaveBeenCalled();
  });

  it('keeps the package editable when its price lookup fails', () => {
    const { catalog, fixture, dialog, stopped } = setup(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Không tải được bảng giá');
    catalog.toggle(stopped);
    expect(dialog.open).toHaveBeenCalledWith(CatalogEditorComponent, expect.anything());
  });
});
