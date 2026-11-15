import { AdminDashboard } from './admin-dashboard.model';
import { AdminDashboardResponse } from './response/admin-dashboard-response';

export class AdminDashboardMapper {
  static fromResponse(response: AdminDashboardResponse): AdminDashboard {
    return { ...response, generatedAt: new Date(response.generatedAt) };
  }
}
