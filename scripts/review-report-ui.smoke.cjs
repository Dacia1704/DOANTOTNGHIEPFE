// Contract-based browser checks. API responses are isolated fixtures, never production writes.
// PLAYWRIGHT_MODULE_PATH may point to an existing playwright/playwright-core installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const site = process.env.FEEDBACK_PREVIEW_URL || 'http://127.0.0.1:4219';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
const now = '2026-11-01T10:00:00';
const baseReview = {
  id: 'review-room',
  type: 'ROOM',
  rating: 4,
  comment: 'Phòng sạch, thông tin chi phí rõ ràng. Khu vực yên tĩnh, thuận tiện đi học.',
  landlordReply: null,
  authorName: 'Nguyễn Minh An',
  authorAvatarUrl: null,
  createdAt: now,
  updatedAt: now,
  verifiedStay: true,
};
const detailReview = (review = baseReview) => ({
  review,
  rentalAgreementId: 'agreement',
  hidden: false,
  hiddenBy: null,
  hiddenAt: null,
  hiddenReason: null,
  targetId: 'room',
  targetName: 'Phòng A101 · Nhà trọ An Nhiên',
});
const pageData = (data, page = 0) => ({
  data,
  currentPage: page,
  totalPages: 1,
  totalElements: data.length,
  pageSize: 10,
});
const agreement = {
  id: 'agreement',
  requestId: 'request',
  agreementCode: 'HD-2026-001',
  roomId: 'room',
  roomNumber: 'A101',
  propertyName: 'Nhà trọ An Nhiên',
  tenantId: 'tenant',
  tenantName: 'Nguyễn Minh An',
  landlordId: 'landlord',
  landlordName: 'Trần Hoàng Nam',
  price: 3500000,
  deposit: 3500000,
  electricityPrice: 3500,
  waterPrice: 20000,
  serviceFee: 100000,
  startDate: '2026-10-01',
  endDate: '2027-09-30',
  status: 'ACTIVE',
  pdfStatus: 'READY',
  pdfSha256: null,
  canDownloadPdf: false,
  canConfirm: false,
  canDecline: false,
  canCheckout: false,
  landlordConfirmedAt: now,
  tenantConfirmedAt: now,
};
const baseReport = {
  id: 'report',
  targetType: 'LANDLORD',
  targetId: 'landlord',
  targetName: 'Trần Hoàng Nam',
  landlordId: 'landlord',
  reasonCode: 'OTHER',
  description: 'Chi phí phát sinh chưa được thông báo trong hợp đồng.',
  status: 'PENDING',
  handledBy: null,
  handledByName: null,
  resolutionNote: null,
  resolvedAt: null,
  createdAt: now,
  updatedAt: now,
};
const room = {
  id: 'room',
  propertyId: 'property',
  roomNumber: 'A101',
  floorNumber: 1,
  landlordId: 'landlord',
  roomTypeId: 'studio',
  roomTypeName: 'Studio',
  price: 3500000,
  areaM2: 25,
  maxOccupants: 2,
  rentalStatus: 'AVAILABLE',
  bookingAvailability: 'AVAILABLE',
  amenities: [],
  images: [],
  defaultDeposit: 3500000,
  electricityPrice: 3500,
  waterPrice: 20000,
  serviceFee: 100000,
};
const listing = {
  id: 'listing',
  title: 'Phòng sáng thoáng tại Nhà trọ An Nhiên',
  description: 'Không gian yên tĩnh, chi phí rõ ràng.',
  status: 'PUBLISHED',
  priorityLevel: 0,
  publishedAt: now,
  expiresAt: '2027-11-01T10:00:00',
  landlordName: 'Trần Hoàng Nam',
  property: {
    id: 'property',
    landlordId: 'landlord',
    name: 'Nhà trọ An Nhiên',
    rentalMode: 'BY_ROOM',
    propertyTypeName: 'Nhà trọ',
    addressLine: '123 Phố Mới',
    wardName: 'Phường Hai Bà Trưng',
    provinceName: 'Hà Nội',
    rooms: [room],
    amenities: [],
    images: [],
    latitude: null,
    longitude: null,
  },
};
const session = (role) => ({
  id: role.toLowerCase(),
  fullName:
    role === 'ADMIN' ? 'Quản trị viên' : role === 'LANDLORD' ? 'Trần Hoàng Nam' : 'Nguyễn Minh An',
  roles: [role],
  authorities: [`ROLE_${role}`],
  accessToken: 'local-fixture-only',
  refreshToken: '',
  status: 'ACTIVE',
  email: 'fixture@example.test',
});

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const state = {
    report: { ...baseReport },
    evidences: [],
    roomWritten: false,
    landlordWritten: false,
    review: detailReview(),
    receivedReply: null,
    createReports: 0,
    uploadAttempts: 0,
    contentRequests: 0,
    visibility: 0,
    replies: 0,
    assignments: 0,
    failAssignment: false,
  };
  const screenshots = 'docs/screenshots';
  fs.mkdirSync(screenshots, { recursive: true });
  async function newPage(role) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', (e) => errors.push(e.message));
    if (role)
      await page.addInitScript(
        (s) => localStorage.setItem('trotot_auth', JSON.stringify(s)),
        session(role),
      );
    await page.route('**/api/**', async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname,
        method = req.method();
      const ok = (data) => route.fulfill({ json: { code: 200, message: 'OK', data } });
      const failure = (message) => route.fulfill({ status: 409, json: { code: 409, message } });
      if (path === '/api/listings/listing') return ok(listing);
      if (path === '/api/listings/listing/bookable-rooms') return ok([room]);
      if (path === '/api/listings/listing/reviews')
        return ok({
          summary: {
            averageRating: null,
            totalReviews: 0,
            replyRate: null,
            distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
          },
          reviews: pageData([]),
        });
      if (path.includes('/reports') && role)
        assert.equal(req.headers()['authorization'], 'Bearer local-fixture-only');
      if (path === '/api/rental-agreements/agreement/review-eligibility') {
        const option = (exists, allowed = true) => ({
          canCreate: allowed && !exists,
          reviewId: exists ? 'saved-review' : null,
          reason: exists ? 'ROOM_REVIEW_EXISTED' : allowed ? null : 'NOT_REVIEW_AUTHOR',
        });
        return ok({
          room: option(state.roomWritten, role === 'TENANT'),
          landlord: option(state.landlordWritten, role === 'TENANT'),
          tenant: option(false, role === 'LANDLORD'),
        });
      }
      if (path === '/api/rental-agreements/agreement') return ok(agreement);
      if (path === '/api/reviews/rooms' && method === 'POST') {
        assert.deepEqual(Object.keys(req.postDataJSON()).sort(), [
          'comment',
          'rating',
          'rentalAgreementId',
        ]);
        state.roomWritten = true;
        return ok(baseReview);
      }
      if (path === '/api/reviews/landlords' && method === 'POST') {
        state.landlordWritten = true;
        return ok({ ...baseReview, type: 'LANDLORD' });
      }
      if (path === '/api/reviews/mine')
        return ok(pageData([detailReview({ ...baseReview, type: url.searchParams.get('type') })]));
      if (path === '/api/tenants/tenant/reviews')
        return ok(pageData([{ ...baseReview, type: 'TENANT', authorName: 'Trần Hoàng Nam' }]));
      if (path === '/api/landlord/reviews')
        return ok(
          pageData([
            {
              review: {
                ...baseReview,
                type: url.searchParams.get('type'),
                landlordReply: state.receivedReply,
              },
              rentalAgreementId: 'agreement',
              agreementCode: 'HD-2026-001',
              targetId: 'room',
              targetName: 'Phòng A101',
              roomId: 'room',
              roomNumber: 'A101',
              propertyId: 'property',
              propertyName: 'Nhà trọ An Nhiên',
              canReply: true,
            },
          ]),
        );
      if (/\/reviews\/(rooms|landlords)\/review-room\/reply$/.test(path)) {
        state.receivedReply = req.postDataJSON().reply;
        state.replies++;
        return ok({ ...baseReview, landlordReply: state.receivedReply });
      }
      if (path === '/api/admin/reviews') {
        const hidden = url.searchParams.get('hidden');
        return ok(
          pageData(hidden !== null && String(state.review.hidden) !== hidden ? [] : [state.review]),
        );
      }
      if (path === '/api/admin/reviews/ROOM/review-room/visibility') {
        const body = req.postDataJSON();
        state.review = {
          ...state.review,
          hidden: body.hidden,
          hiddenReason: body.reason,
          hiddenBy: 'admin',
          hiddenAt: now,
        };
        state.visibility++;
        return ok(state.review);
      }
      if (path === '/api/reports/reasons')
        return ok([
          'SCAM',
          'MISLEADING_INFORMATION',
          'UNSAFE_CONDITION',
          'INAPPROPRIATE_CONTENT',
          'OTHER',
        ]);
      if (path === '/api/reports' && method === 'POST') {
        state.createReports++;
        state.report = { ...baseReport, ...req.postDataJSON() };
        return ok(state.report);
      }
      if (path === '/api/reports/mine' || path === '/api/admin/reports')
        return ok(pageData([state.report]));
      if (path === '/api/admin/reports/summary')
        return ok({
          PENDING: state.report.status === 'PENDING' ? 1 : 0,
          PROCESSING: state.report.status === 'PROCESSING' ? 1 : 0,
          RESOLVED: state.report.status === 'RESOLVED' ? 1 : 0,
          REJECTED: 0,
        });
      if (path === '/api/reports/report')
        return ok({ report: state.report, evidences: state.evidences });
      if (path === '/api/reports/report/evidences') {
        state.uploadAttempts++;
        assert(req.headers()['content-type'].includes('multipart/form-data; boundary='));
        if (state.uploadAttempts === 1)
          return route.fulfill({
            status: 503,
            json: { message: 'Ảnh chưa tải được, vui lòng thử lại.' },
          });
        state.evidences.push({
          id: 'evidence',
          contentUrl: 'https://untrusted.example/do-not-follow',
          createdAt: now,
        });
        return ok(state.evidences[0]);
      }
      if (path === '/api/reports/report/evidences/evidence/content') {
        state.contentRequests++;
        return route.fulfill({ contentType: 'image/png', body: png });
      }
      if (path === '/api/admin/reports/report/assign') {
        state.assignments++;
        state.report = {
          ...state.report,
          status: 'PROCESSING',
          handledBy: state.failAssignment ? 'other-admin' : 'admin',
          handledByName: state.failAssignment ? 'Quản trị viên khác' : 'Quản trị viên',
        };
        if (state.failAssignment) return failure('Báo cáo đã có quản trị viên khác tiếp nhận');
        return ok(state.report);
      }
      if (/\/admin\/reports\/report\/(resolve|reject)$/.test(path)) {
        assert.equal(state.report.handledBy, 'admin');
        assert(req.postDataJSON().resolutionNote.trim());
        state.report = {
          ...state.report,
          status: path.endsWith('/resolve') ? 'RESOLVED' : 'REJECTED',
          resolutionNote: req.postDataJSON().resolutionNote,
          resolvedAt: now,
        };
        return ok(state.report);
      }
      return ok(pageData([]));
    });
    return page;
  }
  async function noOverflow(page) {
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `Horizontal overflow: ${page.url()}`,
    );
  }
  async function capture(page, name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelector('mat-sidenav-content')?.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.screenshot({
      path: `${screenshots}/${name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  try {
    const guest = await newPage();
    await guest.goto(`${site}/bao-cao-cua-toi`);
    await guest.waitForURL(/\/login\?redirect=/);
    await guest.goto(`${site}/tro/listing`);
    await guest.getByRole('button', { name: 'Báo cáo tin đăng', exact: true }).click();
    await guest.waitForURL(/\/login\?redirect=/);
    assert(new URL(guest.url()).searchParams.get('redirect').startsWith('/tro/listing'));
    await guest.close();
    const tenant = await newPage('TENANT');
    await tenant.goto(`${site}/danh-gia-cua-toi`);
    await tenant.getByText('Phòng sạch, thông tin chi phí rõ ràng.', { exact: false }).waitFor();
    await tenant.getByRole('button', { name: 'Đánh giá về tôi', exact: true }).click();
    await tenant.waitForURL(/type=TENANT/);
    await tenant.locator('app-review-card').getByText('Trần Hoàng Nam', { exact: true }).waitFor();
    assert.equal(
      await tenant
        .locator('app-review-page')
        .getByRole('link', { name: 'Xem hợp đồng', exact: true })
        .count(),
      0,
    );
    await tenant.goto(`${site}/hop-dong/agreement`);
    const panel = tenant.locator('app-agreement-review-panel');
    await panel.getByRole('button', { name: 'Viết đánh giá', exact: true }).first().click();
    let dialog = tenant.getByRole('dialog');
    await dialog.getByRole('radio', { name: '3 sao', exact: true }).check();
    await dialog.getByRole('radio', { name: '3 sao', exact: true }).press('ArrowRight');
    assert(await dialog.getByRole('radio', { name: '4 sao', exact: true }).isChecked());
    await dialog.locator('textarea').fill('Trải nghiệm tốt, chi phí rõ ràng.');
    await dialog.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert(state.roomWritten);
    assert.equal(await panel.getByRole('button', { name: 'Đã đánh giá', exact: true }).count(), 1);
    assert.equal(
      await panel.getByRole('button', { name: 'Viết đánh giá', exact: true }).count(),
      1,
    );
    await panel.getByRole('button', { name: 'Báo cáo chủ trọ', exact: true }).click();
    dialog = tenant.getByRole('dialog');
    await dialog.locator('select[name="reason"]').selectOption('OTHER');
    await dialog.locator('textarea').fill('   ');
    assert.equal(
      await dialog.getByRole('button', { name: 'Gửi báo cáo', exact: true }).isEnabled(),
      false,
    );
    await dialog.locator('textarea').fill(baseReport.description);
    await dialog.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
    await dialog.getByText('Báo cáo đã được gửi', { exact: true }).waitFor();
    await dialog
      .locator('input[type=file]')
      .setInputFiles({ name: 'minh-chung.png', mimeType: 'image/png', buffer: png });
    await dialog.getByText('Chưa gửi được', { exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Gửi ảnh này', exact: true }).click();
    await dialog.locator('.evidence-image img').waitFor();
    assert.equal(state.createReports, 1);
    assert.equal(state.uploadAttempts, 2);
    assert(state.contentRequests > 0);
    await dialog.getByRole('button', { name: 'Xem chi tiết báo cáo', exact: true }).click();
    await tenant.waitForURL(/bao-cao-cua-toi\/report/);
    await tenant.locator('.evidence-image img').waitFor();
    await capture(tenant, 'report-tenant-desktop');
    await tenant.setViewportSize({ width: 390, height: 844 });
    await noOverflow(tenant);
    await capture(tenant, 'report-tenant-mobile');
    const owner = await newPage('LANDLORD');
    await owner.goto(`${site}/landlord/reviews`);
    await owner.getByRole('button', { name: 'Viết phản hồi', exact: true }).click();
    dialog = owner.getByRole('dialog');
    await dialog.locator('textarea').fill('Cảm ơn bạn đã chia sẻ trải nghiệm.');
    await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await owner
      .locator('app-review-card')
      .getByText(state.receivedReply, { exact: true })
      .waitFor();
    assert.equal(state.replies, 1);
    await capture(owner, 'review-landlord-desktop');
    await owner.setViewportSize({ width: 390, height: 844 });
    await noOverflow(owner);
    const admin = await newPage('ADMIN');
    await admin.goto(`${site}/admin/reviews`);
    await admin.getByRole('button', { name: 'Ẩn đánh giá', exact: true }).click();
    dialog = admin.getByRole('dialog');
    await dialog.locator('textarea').fill('Thông tin cần được kiểm tra lại.');
    await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await admin.getByRole('button', { name: 'Khôi phục', exact: true }).waitFor();
    assert.equal(state.visibility, 1);
    await capture(admin, 'review-admin-desktop');
    await admin.goto(`${site}/admin/reports`);
    await admin.getByRole('link', { name: /Chi tiết/ }).click();
    await admin.getByRole('button', { name: 'Nhận xử lý', exact: true }).click();
    await admin.locator('textarea[name=note]').waitFor();
    assert.equal(
      await admin.getByRole('button', { name: 'Giải quyết', exact: true }).isEnabled(),
      false,
    );
    await admin
      .locator('textarea[name=note]')
      .fill('Đã xác minh phản ánh và trao đổi hướng xử lý với các bên.');
    await admin.getByRole('button', { name: 'Giải quyết', exact: true }).click();
    await admin.getByRole('heading', { name: 'Kết quả xử lý', exact: true }).waitFor();
    assert.equal(state.report.status, 'RESOLVED');
    await capture(admin, 'report-admin-desktop');
    await admin.setViewportSize({ width: 390, height: 844 });
    await noOverflow(admin);
    await capture(admin, 'report-admin-mobile');
    state.report = { ...baseReport };
    state.failAssignment = true;
    await admin.reload();
    await admin.getByRole('button', { name: 'Nhận xử lý', exact: true }).click();
    await admin.getByText('Báo cáo đã có quản trị viên khác tiếp nhận', { exact: true }).waitFor();
    assert.equal(await admin.getByRole('button', { name: 'Giải quyết', exact: true }).count(), 0);
    assert.equal(await admin.locator('textarea[name=note]').count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: role guards, written/received reviews, agreement eligibility, create once, OTHER validation, upload failure/retry, authenticated Blob images, landlord reply, admin visibility, resolution permissions, concurrent assignment, desktop/mobile layout.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
