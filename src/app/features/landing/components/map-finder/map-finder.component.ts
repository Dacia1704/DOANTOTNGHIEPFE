import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CAMPUS_TAGS, CampusTag } from '../../data/landing.mock';

/**
 * Section "Bản đồ thông minh" — copy layout từ landing-page.html.
 * Ảnh map là static background — khi BE có Google Maps thật sẽ thay bằng embed.
 */
@Component({
  selector: 'app-map-finder',
  imports: [],
  templateUrl: './map-finder.component.html',
  styleUrl: './map-finder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFinderComponent {
  readonly campuses: CampusTag[] = CAMPUS_TAGS;

  readonly mapImage =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC2BBMf0cpc7YDPhvyxB5-ZyQ8yi8cdQ6LvBx94zt0R0HiC_r-i5bffN7ogJFOBtR2OlitvGM_tmWf0rWnNlukGh2JyOpmnAYxzpFheAU06MpcyL93oTFxFDlFs4ERN1YpnmQnM_bQi9HvM55vIVqQ8AGNvcIP4qlsei39geVK5FOkNMElcCscb5AJNCrQPHuME-lhKLJqhCTIHqQCwuvBC0tCsa13ebCb7XjO7P22z2yUa2QS1m680";
}
