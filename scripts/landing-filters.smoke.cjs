// Browser/API contract check; all API responses are isolated fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors = [],
    searches = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    let data = { data: [], currentPage: 0, totalPages: 0, totalElements: 0 };
    if (path === '/api/listings') {
      searches.push(url.searchParams);
      data = {
        data: [],
        currentPage: 0,
        totalPages: 1,
        totalElements: url.searchParams.has('minPrice') ? 12 : 323,
      };
    }
    if (path === '/api/listings/map' || path === '/api/listings/price-statistics') data = [];
    if (path === '/api/provinces') data = [{ id: 'p', name: 'Hà Nội', code: '01' }];
    if (path === '/api/wards')
      data = {
        data: [{ id: 'w', name: 'Phường A', provinceId: 'p' }],
        currentPage: 0,
        totalPages: 1,
      };
    if (path === '/api/room-types/filter')
      data = { data: [{ id: 'studio', name: 'Studio' }], currentPage: 0, totalPages: 1 };
    if (path === '/api/amenities/filter')
      data = { data: [{ id: 'wifi', name: 'Wifi', icon: 'wifi' }], currentPage: 0, totalPages: 1 };
    return route.fulfill({ json: { code: 200, data } });
  });
  try {
    await page.goto(process.env.LANDING_PREVIEW_URL || 'http://127.0.0.1:4217/');
    await page.locator('.advanced-filter-toggle').click();
    const form = page.getByRole('form', { name: 'Bộ lọc nâng cao' });
    await form.locator('[formcontrolname=provinceId]').selectOption('p');
    await form.locator('[formcontrolname=wardId]').selectOption('w');
    await form.locator('[formcontrolname=roomTypeName]').selectOption('Studio');
    await form.locator('[formcontrolname=minPrice]').fill('5000000');
    await form.locator('[formcontrolname=maxPrice]').fill('3000000');
    const before = searches.length;
    await form.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
    await form.getByRole('alert').filter({ hasText: 'Giá tối thiểu' }).waitFor();
    assert.equal(searches.length, before);
    await form.locator('[formcontrolname=minPrice]').fill('2250000');
    await form.locator('[formcontrolname=maxPrice]').fill('4750000');
    await form.getByRole('button', { name: 'Wifi', exact: true }).click();
    const applied = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/listings' &&
        new URL(r.url()).searchParams.get('minPrice') === '2250000',
    );
    await form.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
    await applied;
    await page.getByText('12 tin đăng phù hợp với lựa chọn của bạn.', { exact: true }).waitFor();
    const query = searches.at(-1);
    for (const [key, value] of Object.entries({
      provinceId: 'p',
      wardId: 'w',
      roomTypeName: 'Studio',
      minPrice: '2250000',
      maxPrice: '4750000',
      page: '0',
    }))
      assert.equal(query.get(key), value);
    assert.deepEqual(query.getAll('amenityNames'), ['Wifi']);
    fs.mkdirSync('docs/screenshots', { recursive: true });
    await form.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/screenshots/landing-advanced-filters-desktop.png',
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await form.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/screenshots/landing-advanced-filters-mobile.png',
      animations: 'disabled',
    });
    await form.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    await page.getByText('323 tin đăng phù hợp với lựa chọn của bạn.', { exact: true }).waitFor();
    assert.equal(searches.at(-1).has('minPrice'), false);
    assert.equal(searches.at(-1).has('provinceId'), false);
    assert.equal(searches.at(-1).has('amenityNames'), false);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: advanced filters, price validation, API parameters, result count, reset and desktop/mobile layout.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
