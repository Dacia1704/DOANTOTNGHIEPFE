// Browser contract fixtures: no writes to the application database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const statuses = ['ACCEPTED', 'PENDING', 'PENDING', 'REJECTED', 'EXPIRED'];
const requests = statuses.map((status, index) => ({
  id: `request-${index}`,
  listingId: 'listing',
  propertyId: 'property',
  propertyName: index === 2 ? 'Nhà trọ Bình Thạnh' : 'Nhà trọ An Nhiên',
  roomId: `room-${index}`,
  roomNumber: `A10${index + 1}`,
  tenantName: 'Nguyễn Minh An',
  status,
  proposedMoveInDate: '2027-01-01',
  endDate: '2027-12-31',
  durationMonths: 12,
  occupantCount: 2,
  createdAt: `2026-11-${String(10 - index).padStart(2, '0')}T10:00:00`,
  expiresAt: '2026-11-17T10:00:00',
  agreementId: index === 0 ? 'agreement' : null,
  resolutionReason: status === 'REJECTED' ? 'Phòng đã có người thuê.' : null,
  card: {
    thumbnailUrl: '/landing_1.png',
    fullAddress:
      index === 2 ? 'Điện Biên Phủ, Bình Thạnh, TP.HCM' : '123 Phố Mới, Hai Bà Trưng, Hà Nội',
    roomTypeName: 'Studio',
    areaM2: 25,
    landlordName: 'Trần Hoàng Nam',
    price: 3500000,
    listingTitle: 'Studio thoáng sáng, đầy đủ tiện nghi',
  },
}));
const agreement = {
  id: 'agreement',
  requestId: 'request-0',
  agreementCode: 'HD-hidden-uuid',
  propertyName: 'Nhà trọ An Nhiên',
  roomNumber: 'A101',
  landlordName: 'Trần Hoàng Nam',
  tenantName: 'Nguyễn Minh An',
  startDate: '2027-01-01',
  endDate: '2027-12-31',
  price: 3500000,
  deposit: 3500000,
  status: 'ACTIVE',
  pdfStatus: 'READY',
  card: requests[0].card,
};
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
  });
  const errors = [],
    queries = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      'trotot_auth',
      JSON.stringify({
        id: 'tenant',
        fullName: 'Nguyễn Minh An',
        email: 'an@example.test',
        accessToken: 'fixture',
        roles: ['TENANT'],
        authorities: ['ROLE_TENANT'],
        status: 'ACTIVE',
      }),
    ),
  );
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    let data = { data: [], currentPage: 0, totalPages: 0, totalElements: 0 };
    if (path.endsWith('/authorities')) data = ['ROLE_TENANT'];
    if (path.endsWith('/unread-count')) data = { count: 0 };
    if (path === '/api/rental-requests/my/summary')
      data = {
        totalRequests: 5,
        statuses: { PENDING: 2, ACCEPTED: 1, REJECTED: 1, EXPIRED: 1, CANCELLED: 0 },
        totalAgreements: 1,
      };
    if (path === '/api/rental-requests/my') {
      queries.push(Object.fromEntries(url.searchParams));
      let values = requests.filter(
        (r) => !url.searchParams.get('status') || r.status === url.searchParams.get('status'),
      );
      const q = (url.searchParams.get('q') || '').toLocaleLowerCase('vi');
      values = values.filter((r) =>
        `${r.propertyName} ${r.card.fullAddress}`.toLocaleLowerCase('vi').includes(q),
      );
      if (url.searchParams.get('sort') === 'oldest') values = [...values].reverse();
      data = { data: values, currentPage: 0, totalPages: 1, totalElements: values.length };
    }
    if (path === '/api/rental-agreements/my')
      data = { data: [agreement], currentPage: 0, totalPages: 1, totalElements: 1 };
    if (path === '/api/rental-requests/request-0')
      data = {
        ...requests[0],
        tenantPhone: '0912345678',
        message: 'Tôi muốn thuê phòng gần trường.',
      };
    return route.fulfill({ json: { code: 200, data } });
  });
  try {
    await page.goto(process.env.RENTAL_PREVIEW_URL || 'http://127.0.0.1:4217/yeu-cau-thue');
    await page.locator('.rental-feed-card').nth(4).waitFor();
    const tabs = page.locator('.status-tabs button');
    assert((await tabs.nth(4).innerText()).includes('Đã hết hạn'));
    assert((await tabs.nth(5).innerText()).includes('Hợp đồng'));
    assert((await page.locator('.tenant-content').innerText()).includes('3.500.000'));
    fs.mkdirSync('docs/screenshots', { recursive: true });
    await page.screenshot({
      path: 'docs/screenshots/my-rental-requests-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await tabs.nth(1).click();
    await page.waitForFunction(() => document.querySelectorAll('.rental-feed-card').length === 2);
    assert.equal(queries.at(-1).status, 'PENDING');
    assert.equal(queries.at(-1).page, '0');
    await page
      .getByRole('searchbox', { name: 'Từ khóa tìm yêu cầu và hợp đồng' })
      .fill('Bình Thạnh');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.rental-feed-card').length === 1);
    assert.equal(queries.at(-1).q, 'Bình Thạnh');
    await page.getByRole('combobox', { name: 'Sắp xếp kết quả' }).selectOption('oldest');
    await page.waitForResponse((r) => r.url().includes('sort=oldest'));
    assert.equal(queries.at(-1).sort, 'oldest');
    await page.getByRole('searchbox', { name: 'Từ khóa tìm yêu cầu và hợp đồng' }).fill('');
    await tabs.nth(5).click();
    await page.getByRole('heading', { name: 'Hợp đồng của tôi', exact: true }).waitFor();
    assert.equal(await page.locator('.agreement-feed-card').count(), 1);
    assert(!(await page.locator('.tenant-feed').innerText()).includes('HD-hidden-uuid'));
    assert(
      (await page.locator('.tenant-feed').innerText()).includes(
        'Hợp đồng giữa Trần Hoàng Nam và Nguyễn Minh An',
      ),
    );
    await page.screenshot({
      path: 'docs/screenshots/my-rental-contracts-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Yêu cầu gốc', exact: true }).click();
    const modal = page.getByRole('dialog');
    await modal.getByText('Tôi muốn thuê phòng gần trường.', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Đóng chi tiết yêu cầu', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({
      path: 'docs/screenshots/my-rental-contracts-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await tabs.nth(4).click();
    await page.locator('.rental-feed-card[data-status=EXPIRED]').waitFor();
    assert.equal(await page.locator('.rental-feed-card').count(), 1);
    await page.screenshot({
      path: 'docs/screenshots/my-rental-requests-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    assert.deepEqual(errors, []);
    console.log(
      'PASS: template feed, status tabs/counts, server search/sort, contracts after expired, shared cards without IDs, detail modal, desktop/mobile.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
