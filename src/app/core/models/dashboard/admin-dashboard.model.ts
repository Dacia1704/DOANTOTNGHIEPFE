import { DashboardPoint } from './dashboard-point.model';
export type { DashboardPoint } from './dashboard-point.model';

export interface AdminDashboard {
  from: string;
  to: string;
  generatedAt: Date;
  current: Record<string, number>;
  period: Record<string, number>;
  previous: Record<string, number>;
  listingStatuses: Record<string, number>;
  series: DashboardPoint[];
}
