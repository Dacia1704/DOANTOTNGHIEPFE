import { LandlordDashboard } from './landlord-dashboard.model';
import { LandlordDashboardResponse } from './response/landlord-dashboard-response';

export class LandlordDashboardMapper {
  static fromResponse(response: LandlordDashboardResponse): LandlordDashboard {
    return {
      ...response,
      generatedAt: new Date(response.generatedAt),
      servicePackage: {
        ...response.servicePackage,
        endsAt: response.servicePackage.endsAt ? new Date(response.servicePackage.endsAt) : null,
      },
    };
  }
}
