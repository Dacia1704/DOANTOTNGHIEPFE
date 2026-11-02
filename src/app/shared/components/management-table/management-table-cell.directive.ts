import { Directive, TemplateRef, inject, input } from '@angular/core';

export interface ManagementTableCellContext<T> {
  $implicit: T;
  index: number;
}

/** Bind the source rows so Angular can type-check `let-row` in custom cells. */
@Directive({ selector: 'ng-template[appTableCell]' })
export class ManagementTableCellDirective<T> {
  readonly appTableCell = input.required<readonly T[]>();
  readonly column = input.required<string>();
  readonly template = inject<TemplateRef<ManagementTableCellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _directive: ManagementTableCellDirective<T>,
    context: unknown,
  ): context is ManagementTableCellContext<T> {
    return true;
  }
}
