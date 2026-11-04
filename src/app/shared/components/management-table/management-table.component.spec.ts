import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ManagementTableComponent, ManagementTableColumn } from './management-table.component';
import { ManagementTableCellDirective } from './management-table-cell.directive';

interface Item {
  id: string;
  name: string;
  count: number;
}

@Component({
  imports: [ManagementTableComponent, ManagementTableCellDirective],
  template: `
    <app-management-table
      [rows]="rows()"
      [columns]="columns"
      [rowKey]="key"
      caption="Danh sách mẫu"
      [loading]="loading()"
      [disabled]="disabled()"
      [error]="error()"
      [pagination]="pagination()"
      (pageChange)="pageChange($event)"
      (retry)="retry()"
      (pageSizeChange)="pageSizeChange($event)"
    >
      <div tableToolbar class="toolbar">Quản lý dữ liệu</div>
      <ng-template [appTableCell]="rows()" column="name" let-row>
        <button class="select-row" (click)="select(row)">{{ row.name }}</button>
      </ng-template>
      <button tableEmpty class="create">Tạo bản ghi</button>
    </app-management-table>
  `,
})
class TableHost {
  readonly rows = signal<Item[]>([{ id: 'a', name: 'Cơ sở A', count: 0 }]);
  readonly columns: ManagementTableColumn<Item>[] = [
    { key: 'name', label: 'Tên' },
    { key: 'count', label: 'Số phòng', value: (row) => row.count, align: 'right' },
  ];
  readonly key = (row: Item) => row.id;
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly error = signal('');
  readonly pagination = signal({ page: 0, total: 3, totalPages: 3 });
  readonly select = vi.fn();
  readonly retry = vi.fn();
  readonly pageChange = vi.fn();
  readonly pageSizeChange = vi.fn();
}

describe('shared management table', () => {
  function setup() {
    const fixture = TestBed.createComponent(TableHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, host, element };
  }

  it('renders custom cells, preserves zero values and updates actions when rows change', () => {
    const { fixture, host, element } = setup();
    expect(element.querySelector('caption')?.textContent).toContain('Danh sách mẫu');
    expect(element.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    expect(element.querySelectorAll('tbody td')[1].textContent?.trim()).toBe('0');
    host.rows.set([{ id: 'a', name: 'Cơ sở đã sửa', count: 4 }]);
    fixture.detectChanges();
    (element.querySelector('.select-row') as HTMLButtonElement).click();
    expect(host.select).toHaveBeenCalledWith(host.rows()[0]);
    expect(element.textContent).toContain('Cơ sở đã sửa');
  });

  it('shows loading and retry states before exposing stale rows', () => {
    const { fixture, host, element } = setup();
    host.loading.set(true);
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')).not.toBeNull();
    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.table-pagination button')?.disabled).toBe(
      true,
    );
    host.loading.set(false);
    host.error.set('Không tải được dữ liệu');
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Không tải được dữ liệu',
    );
    (element.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    expect(host.retry).toHaveBeenCalledOnce();
    expect(element.querySelector('.table-pagination')).toBeNull();
  });

  it('shows the projected empty action and keeps column structure', () => {
    const { fixture, host, element } = setup();
    host.rows.set([]);
    host.pagination.set({ page: 0, total: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(element.textContent).toContain('Chưa có dữ liệu');
    expect(element.querySelector('.create')).not.toBeNull();
    expect(element.querySelector('tbody td')?.getAttribute('colspan')).toBe('2');
    expect(element.querySelector('.table-pagination')).not.toBeNull();
    expect(element.querySelector('.table-pagination')?.textContent).toContain('Trang 0 / 0');
  });

  it('keeps toolbar and page-size choices in the table panel even for one page', () => {
    const { fixture, host, element } = setup();
    host.pagination.set({ page: 0, total: 1, totalPages: 1 });
    fixture.detectChanges();
    expect(element.querySelector('.management-table .table-toolbar .toolbar')).not.toBeNull();
    const select = element.querySelector<HTMLSelectElement>('.page-size select')!;
    expect([...select.options].map((option) => option.value)).toEqual(['5', '10', '20']);
    expect(select.value).toBe('10');
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    expect(host.pageSizeChange).toHaveBeenCalledExactlyOnceWith(20);
    const table = fixture.debugElement.query(By.directive(ManagementTableComponent))
      .componentInstance as ManagementTableComponent<Item>;
    table.changePageSize('7');
    host.loading.set(true);
    fixture.detectChanges();
    table.changePageSize('5');
    expect(select.disabled).toBe(true);
    expect(host.pageSizeChange).toHaveBeenCalledTimes(1);
  });

  it('emits only valid page changes and leaves fetching to the caller', () => {
    const { fixture, host, element } = setup();
    const buttons = element.querySelectorAll<HTMLButtonElement>('.table-pagination button');
    expect(buttons[0].disabled).toBe(true);
    buttons[1].click();
    expect(host.pageChange).toHaveBeenCalledExactlyOnceWith(1);
    expect(host.pagination().page).toBe(0);
    const table = fixture.debugElement.query(By.directive(ManagementTableComponent))
      .componentInstance as ManagementTableComponent<Item>;
    for (const page of [-1, 0, 3]) table.changePage(page);
    host.loading.set(true);
    fixture.detectChanges();
    table.changePage(1);
    expect(host.pageChange).toHaveBeenCalledTimes(1);
  });

  it('locks pagination while a row action is running without hiding rows', () => {
    const { fixture, host, element } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    expect(element.querySelector('.select-row')).not.toBeNull();
    expect(element.querySelector<HTMLSelectElement>('.page-size select')?.disabled).toBe(true);
    expect(
      [...element.querySelectorAll<HTMLButtonElement>('.table-pagination button')].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
    const table = fixture.debugElement.query(By.directive(ManagementTableComponent))
      .componentInstance as ManagementTableComponent<Item>;
    table.changePage(1);
    table.changePageSize('20');
    expect(host.pageChange).not.toHaveBeenCalled();
    expect(host.pageSizeChange).not.toHaveBeenCalled();
  });
});
