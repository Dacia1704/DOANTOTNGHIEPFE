import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Coordinates } from '@model/maps/maps.model';
import { LocationUtils } from '@shared/utils/location-utils';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly document = inject(DOCUMENT);
  locate(): Promise<Coordinates> {
    const geolocation = this.document.defaultView?.navigator.geolocation;
    if (!geolocation)
      return Promise.reject(
        new Error('Trình duyệt chưa hỗ trợ định vị. Hãy chọn một địa điểm trên bản đồ.'),
      );
    return new Promise((resolve, reject) =>
      geolocation.getCurrentPosition(
        (position) => {
          const point = LocationUtils.point(position.coords.latitude, position.coords.longitude);
          if (point) resolve(point);
          else reject(new Error('Không xác định được vị trí. Hãy chọn địa điểm khác.'));
        },
        (error) =>
          reject(
            new Error(
              error.code === 1
                ? 'Bạn chưa cho phép định vị. Hãy bật quyền Vị trí trong phần cài đặt trang web của trình duyệt, rồi bấm Vị trí của tôi để thử lại.'
                : 'Chưa lấy được vị trí hiện tại. Vui lòng thử lại hoặc chọn địa điểm khác.',
            ),
          ),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      ),
    );
  }
}
