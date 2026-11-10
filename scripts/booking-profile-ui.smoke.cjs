// Isolated API fixtures verify rendered pages and HTTP payloads without modifying user data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const site = process.env.RENTAL_PREVIEW_URL || 'http://127.0.0.1:4217';
const session = {
  id: 'tenant',
  fullName: 'Nguyễn Minh An',
  email: 'an@example.test',
  phone: '0912345678',
  roles: ['TENANT'],
  authorities: ['ROLE_TENANT'],
  accessToken: 'fixture',
  status: 'ACTIVE',
};
const room = {
  id: 'room',
  propertyId: 'property',
  landlordId: 'owner',
  roomNumber: 'A101',
  roomTypeId: 'studio',
  roomTypeName: 'Studio',
  price: 3500000,
  areaM2: 25,
  maxOccupants: 2,
  bookingAvailability: 'AVAILABLE',
  rentalStatus: 'AVAILABLE',
  defaultDeposit: 3500000,
  electricityPrice: 3500,
  waterPrice: 20000,
  serviceFee: 100000,
  amenities: [],
  images: [],
};
const listing = {
  id: 'listing',
  title: 'Phòng sáng thoáng tại An Nhiên',
  status: 'PUBLISHED',
  publishedAt: '2026-11-01T10:00:00',
  expiresAt: '2027-11-01T10:00:00',
  property: {
    id: 'property',
    name: 'Nhà trọ An Nhiên',
    rentalMode: 'BY_ROOM',
    propertyTypeName: 'Nhà trọ',
    addressLine: '123 Phố Mới',
    wardName: 'Hai Bà Trưng',
    provinceName: 'Hà Nội',
    landlordId: 'owner',
    rooms: [room],
    amenities: [],
    images: [],
  },
};
const place = {
  id: 'poi-hn-hust',
  name: 'Đại học Bách khoa Hà Nội',
  category: 'UNIVERSITY',
  address: '1 Đại Cồ Việt, Hà Nội',
  latitude: 21.007,
  longitude: 105.8431,
};
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((s) => localStorage.setItem('trotot_auth', JSON.stringify(s)), session);
  let profile = null,
    booking = null;
  const ok = (route, data) => route.fulfill({ json: { code: 200, data } });
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path === '/api/listings/listing') return ok(route, listing);
    if (path === '/api/users/me')
      return ok(route, {
        ...session,
        citizenId: '012345678901',
        createdAt: '2026-01-01',
        emailVerifiedAt: '2026-01-01',
      });
    if (path === '/api/users/me/authorities') return ok(route, ['ROLE_TENANT']);
    if (path === '/api/users/me/tenant-profile') {
      if (req.method() === 'PUT') profile = req.postDataJSON();
      return ok(route, profile);
    }
    if (path === '/api/nearby-places') return ok(route, [place]);
    if (path === '/api/provinces') return ok(route, [{ id: 'p', name: 'Hà Nội', code: '01' }]);
    if (path === '/api/wards')
      return ok(route, {
        data: [{ id: 'w', name: 'Hai Bà Trưng', code: '1', provinceId: 'p' }],
        currentPage: 0,
        totalPages: 1,
      });
    if (path === '/api/amenities/filter')
      return ok(route, {
        data: [{ id: 'wifi', name: 'Wifi', icon: 'wifi' }],
        currentPage: 0,
        totalPages: 1,
      });
    if (path === '/api/room-types/filter')
      return ok(route, { data: [{ id: 'studio', name: 'Studio' }], currentPage: 0, totalPages: 1 });
    if (path === '/api/rental-requests/my' || path === '/api/rental-requests/request-detail') {
      const detail = {
        id: 'request-detail',
        listingId: 'listing',
        roomId: 'room',
        roomNumber: 'A101',
        propertyId: 'property',
        propertyName: 'Nhà trọ An Nhiên',
        tenantName: session.fullName,
        tenantPhone: session.phone,
        tenantEmail: session.email,
        maskedCitizenId: '********8901',
        permanentAddress: 'Hà Nội, Việt Nam',
        proposedMoveInDate: '2027-01-01',
        endDate: '2027-12-31',
        durationMonths: 12,
        occupantCount: 2,
        message: 'Tôi muốn thuê phòng gần trường.',
        status: 'PENDING',
        createdAt: '2026-11-10T10:00:00',
        expiresAt: '2026-11-17T10:00:00',
        roomDetails: {
          listingTitle: listing.title,
          landlordName: 'Chủ trọ An Nhiên',
          rentalMode: 'BY_ROOM',
          roomTypeName: 'Studio',
          floorNumber: 1,
          areaM2: 25,
          maxOccupants: 2,
          fullAddress: '123 Phố Mới, Hai Bà Trưng, Hà Nội',
          latitude: 21.007,
          longitude: 105.8431,
          price: 3500000,
          deposit: 3500000,
          electricityPrice: 3500,
          waterPrice: 20000,
          serviceFee: 100000,
          priceSource: 'CURRENT_ROOM',
        },
      };
      return ok(
        route,
        path.endsWith('/my')
          ? { data: [detail], currentPage: 0, totalPages: 1, totalElements: 1 }
          : detail,
      );
    }
    if (path === '/api/rental-requests' && req.method() === 'POST') {
      booking = req.postDataJSON();
      return route.fulfill({ status: 409, json: { errorCode: 'ROOM_UNAVAILABLE' } });
    }
    if (path.endsWith('/summary'))
      return ok(route, { totalReviews: 0, averageRating: 0, ratingCounts: {} });
    if (path.endsWith('/unread-count')) return ok(route, { count: 0 });
    return ok(route, { data: [], currentPage: 0, totalPages: 0, totalElements: 0 });
  });
  try {
    await page.goto(`${site}/tro/listing/dat-phong/room`);
    await page.getByRole('heading', { name: 'Gửi yêu cầu thuê phòng trọ', exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.locator('[formcontrolname=tenantFullName]').waitFor();
    assert.equal(
      await page.locator('[formcontrolname=tenantFullName]').inputValue(),
      session.fullName,
    );
    assert((await page.locator('.room-info').innerText()).includes('3.500.000'));
    await page.reload();
    await page.locator('[formcontrolname=tenantCitizenId]').fill('012345678901');
    await page.locator('[formcontrolname=tenantPermanentAddress]').fill('Hà Nội, Việt Nam');
    await page.locator('[formcontrolname=proposedMoveInDate]').fill('2090-01-31');
    await page.locator('[formcontrolname=acceptedPrivacyNotice]').check();
    await page.getByRole('button', { name: 'Gửi yêu cầu thuê phòng', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Phòng vừa được người khác' }).waitFor();
    assert.equal(booking.roomId, 'room');
    assert.equal(booking.listingId, 'listing');
    assert.equal(booking.price, undefined);
    fs.mkdirSync('docs/screenshots', { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/screenshots/booking-page-desktop.png', fullPage: true });
    await page.goto(`${site}/trang-ca-nhan`);
    await page.getByRole('button', { name: 'Hồ sơ tìm trọ', exact: false }).click();
    await page.getByRole('heading', { name: 'Thiết lập hồ sơ nhu cầu thuê phòng' }).waitFor();
    await page.getByRole('button', { name: 'Đại học Bách khoa Hà Nội', exact: false }).click();
    await page.getByRole('button', { name: '3 — 5 triệu', exact: true }).click();
    await page.locator('[formcontrolname=desiredProvinceId]').selectOption('p');
    await page.getByRole('button', { name: 'Hai Bà Trưng', exact: true }).click();
    await page.getByLabel('Wifi', { exact: true }).check();
    await page.getByLabel('Bắt buộc', { exact: true }).check();
    await page.getByRole('button', { name: 'Lưu hồ sơ tìm trọ', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã lưu hồ sơ tìm trọ.' }).first().waitFor();
    assert.equal(profile.anchorPlaceId, place.id);
    assert.equal(profile.anchorLatitude, place.latitude);
    assert.equal(profile.anchorLongitude, place.longitude);
    assert.equal(profile.anchorLabel, place.name);
    assert.deepEqual(profile.wardIds, ['w']);
    assert.deepEqual(profile.requiredAmenityIds, ['wifi']);
    assert.equal(profile.priceMin, 3000000);
    assert.equal(profile.priceMax, 5000000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/screenshots/tenant-profile-desktop.png', fullPage: true });
    await page.reload();
    await page.getByRole('button', { name: 'Hồ sơ tìm trọ', exact: false }).click();
    await page.locator('[formcontrolname=anchorLabel]').waitFor();
    assert.equal(await page.locator('[formcontrolname=anchorLabel]').inputValue(), place.name);
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/screenshots/tenant-profile-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Xóa địa điểm', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu hồ sơ tìm trọ', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã lưu hồ sơ tìm trọ.' }).first().waitFor();
    assert.equal(profile.anchorPlaceId, null);
    assert.equal(profile.anchorLatitude, null);
    assert.equal(profile.anchorLongitude, null);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${site}/yeu-cau-thue`);
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Chi tiết yêu cầu thuê', exact: true });
    await modal.getByText('Tôi muốn thuê phòng gần trường.', { exact: true }).waitFor();
    assert((await modal.innerText()).includes('3.500.000'));
    assert((await modal.innerText()).includes('********8901'));
    assert.equal(await modal.locator('app-property-location').count(), 1);
    assert.equal(await modal.locator('app-map-canvas').count(), 1);
    await page.screenshot({
      path: 'docs/screenshots/rental-request-modal-desktop.png',
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth + 1));
    await page.screenshot({
      path: 'docs/screenshots/rental-request-modal-mobile.png',
      animations: 'disabled',
    });
    await modal.getByRole('button', { name: 'Đóng chi tiết yêu cầu', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: booking and profile flows; rental request detail modal, private data, room/fees, map component, closing and mobile layout.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
