import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardPoint } from '@model/dashboard/dashboard-point.model';
import { ChartRevealDirective } from './chart-reveal.directive';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

/** A small SVG chart: no remote scripts, dates with no events remain visible. */
@Component({
  selector: 'app-dashboard-chart',
  imports: [ChartRevealDirective],
  templateUrl: './dashboard-chart.component.html',
  styleUrl: './dashboard-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardChartComponent {
  readonly points = input.required<DashboardPoint[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly kind = input<'bar' | 'line'>('line');
  readonly money = input(false);
  readonly label = input.required<string>();
  readonly groupSize = computed(() => Math.max(1, Math.ceil(this.points().length / 10)));
  readonly groups = computed(() => {
    const source = this.points();
    const size = this.groupSize();
    const groups = [];
    for (let i = 0; i < source.length; i += size) {
      const part = source.slice(i, i + size);
      const values: Record<string, number> = {};
      for (const point of part) {
        for (const series of this.series())
          values[series.key] = (values[series.key] || 0) + (point.values[series.key] || 0);
      }
      const first = this.shortDate(part[0].date);
      const last = this.shortDate(part[part.length - 1].date);
      groups.push({ label: first, range: first === last ? first : `${first} – ${last}`, values });
    }
    return groups;
  });
  readonly max = computed(() => {
    const max = Math.max(
      0,
      ...this.groups().map((p) =>
        this.kind() === 'bar'
          ? this.series().reduce((total, s) => total + (p.values[s.key] || 0), 0)
          : Math.max(0, ...this.series().map((s) => p.values[s.key] || 0)),
      ),
    );
    if (!max) return 4;
    const power = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / power / 4) * power * 4;
  });
  readonly hasData = computed(() =>
    this.groups().some((p) => this.series().some((s) => p.values[s.key] > 0)),
  );
  readonly ticks = computed(() =>
    [0, 1, 2, 3, 4].map((i) => ({ y: 205 - i * 45, value: (this.max() * i) / 4 })),
  );
  readonly lines = computed(() =>
    this.series().map((series) => ({
      ...series,
      path: this.groups()
        .map((p, i) => `${i ? 'L' : 'M'}${this.x(i)},${this.y(p.values[series.key] || 0)}`)
        .join(' '),
    })),
  );
  readonly bars = computed(() =>
    this.groups().map((p, i) => {
      let total = 0;
      return this.series().map((series) => {
        const value = p.values[series.key] || 0;
        total += value;
        return {
          key: series.key,
          x: this.x(i) - this.barWidth() / 2,
          y: this.y(total),
          height: (value / this.max()) * 180,
          color: series.color,
          value,
          description: `${p.range} · ${series.label}: ${this.format(value)}`,
        };
      });
    }),
  );
  x(index: number) {
    return 65 + ((index + 0.5) * 575) / Math.max(this.groups().length, 1);
  }
  y(value: number) {
    return 205 - (value / this.max()) * 180;
  }
  barWidth() {
    return Math.min(32, (575 / Math.max(this.groups().length, 1)) * 0.5);
  }
  shortDate(value: string) {
    return `${value.slice(8, 10)}/${value.slice(5, 7)}`;
  }
  format(value: number) {
    return new Intl.NumberFormat('vi-VN').format(value) + (this.money() ? ' ₫' : '');
  }
  compact(value: number) {
    return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  }
}
