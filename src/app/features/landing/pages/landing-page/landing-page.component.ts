import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CategoryBarComponent } from '../../components/category-bar/category-bar.component';
import { SearchCapsuleComponent } from '../../components/search-capsule/search-capsule.component';
import { QuickFilterBarComponent } from '../../components/quick-filter-bar/quick-filter-bar.component';
import { AiRecommendationComponent } from '../../components/ai-recommendation/ai-recommendation.component';
import { RoomGridComponent } from '../../components/room-grid/room-grid.component';
import { MapFinderComponent } from '../../components/map-finder/map-finder.component';
import { LandlordCtaComponent } from '../../components/landlord-cta/landlord-cta.component';

/**
 * Trang landing page của tenant.
 * Cấu trúc:
 *  - Hero (badge + h1 + p + search capsule)
 *  - Quick filter bar
 *  - AI recommendation
 *  - Room grid (8 phòng)
 *  - Map finder
 *  - Landlord CTA
 */
@Component({
  selector: 'app-landing-page',
  imports: [
    CategoryBarComponent,
    SearchCapsuleComponent,
    QuickFilterBarComponent,
    AiRecommendationComponent,
    RoomGridComponent,
    MapFinderComponent,
    LandlordCtaComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {}
