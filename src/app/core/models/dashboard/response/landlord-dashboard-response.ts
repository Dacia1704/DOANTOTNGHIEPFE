import { LandlordDashboard } from '../landlord-dashboard.model';

export interface LandlordDashboardResponse extends Omit<
  LandlordDashboard,
  'generatedAt' | 'servicePackage'
> {
  generatedAt: string;
  servicePackage: Omit<LandlordDashboard['servicePackage'], 'endsAt'> & { endsAt: string | null };
}
