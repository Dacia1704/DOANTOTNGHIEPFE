import { DashboardPoint } from './dashboard-point.model';

export interface LandlordDashboard {
  from: string;
  to: string;
  generatedAt: Date;
  current: Record<string, number>;
  period: Record<string, number>;
  previous: Record<string, number>;
  roomStatuses: Record<string, number>;
  listingStatuses: Record<string, number>;
  servicePackage: {
    name: string;
    endsAt: Date | null;
    maxListings: number | null;
    usedListings: number;
    remainingHigh: number;
    remainingLow: number | null;
    active: boolean;
  };
  boost: {
    activePackages: number;
    assignedListings: number;
    remainingHigh: number;
    remainingLow: number;
  };
  series: DashboardPoint[];
}
