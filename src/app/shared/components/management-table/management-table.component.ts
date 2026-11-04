import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChildren, input, output } from '@angular/core';
import { ManagementTableCellDirective } from './management-table-cell.directive';

export interface ManagementTableColumn<T> {
  key: string;
  label: string;
  value?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

/** Pagination is controlled by the caller; rows may come from a server or local data. */
export interface ManagementTablePagination {
  page: number;
  total: number;
  totalPages: number;
}

@Component({
  selector: 'app-management-table',
  imports: [NgTemplateOutlet],
  templateUrl: './management-table.component.html',
  styleUrl: './management-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementTableComponent<T> {
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly ManagementTableColumn<T>[]>();
  readonly rowKey = input.required<(row: T) => string | number>();
  readonly caption = input.required<string>();
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly error = input('');
  readonly emptyMessage = input('Chưa có dữ liệu');
  readonly emptyDescription = input('');
  readonly pagination = input<ManagementTablePagination | null>(null);
  readonly pageSize = input(10);
  readonly pageSizeOptions = [5, 10, 20] as const;
  readonly pageSizeChange = output<number>();
  readonly pageChange = output<number>();
  readonly retry = output<void>();
  readonly cells = contentChildren(ManagementTableCellDirective);

  cellTemplate(key: string) {
    return this.cells().find((cell) => cell.column() === key)?.template ?? null;
  }

  changePageSize(value: string): void {
    const size = Number(value);
    if (
      this.loading() ||
      this.disabled() ||
      !this.pageSizeOptions.some((option) => option === size) ||
      size === this.pageSize()
    )
      return;
    this.pageSizeChange.emit(size);
  }

  changePage(page: number): void {
    const pagination = this.pagination();
    if (
      !pagination ||
      this.loading() ||
      this.disabled() ||
      page < 0 ||
      page >= pagination.totalPages ||
      page === pagination.page
    )
      return;
    this.pageChange.emit(page);
  }
}
