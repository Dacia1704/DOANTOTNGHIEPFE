import { AdminDashboard } from '../admin-dashboard.model';

export interface AdminDashboardResponse extends Omit<AdminDashboard, 'generatedAt'> {
  generatedAt: string;
}
