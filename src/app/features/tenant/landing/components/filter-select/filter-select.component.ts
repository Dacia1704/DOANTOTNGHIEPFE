import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-select',
  imports: [MatSelectModule],
  templateUrl: './filter-select.component.html',
  styleUrl: './filter-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The select panel is rendered in the CDK overlay, outside the component host.
  encapsulation: ViewEncapsulation.None,
})
export class FilterSelectComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) icon = '';
  @Input() value = '';
  @Input() options: FilterOption[] = [];
  @Output() readonly valueChange = new EventEmitter<string>();

  get selectedLabel(): string {
    return this.options.find((option) => option.value === this.value)?.label ?? '';
  }
}
