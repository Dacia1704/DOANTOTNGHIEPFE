const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.LISTING_PREVIEW_URL || 'http://127.0.0.1:4207';
const api = process.env.LISTING_SIMULATION_URL || 'http://127.0.0.1:4907/api';

async function createProperty(label) {
  const response = await fetch(`${api}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: label,
      propertyTypeId: 'pt',
      rentalMode: 'BY_ROOM',
      totalFloors: 1,
      provinceId: 'p',
      wardId: 'w',
      addressLine: '99 Đại La',
      defaultRoom: { roomTypeId: 'rt', price: 3000000, areaM2: 25, maxOccupants: 2 },
      floors: [{ floorNumber: 1, rooms: [{ roomNumber: 'T01' }] }],
    }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.id;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    assert.equal((await fetch(`${api}/test/listing-boost-reset`, { method: 'POST' })).status, 200);
    for (const [label, viewport, group, level] of [
      ['desktop', { width: 1440, height: 1100 }, 'ui-boost-high', 2],
      ['mobile', { width: 390, height: 844 }, 'ui-boost-low', 1],
    ]) {
      const propertyId = await createProperty(`Boost ${label}`);
      const page = await browser.newPage({ viewport });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() =>
        localStorage.setItem(
          'trotot_auth',
          JSON.stringify({
            id: 'owner',
            fullName: 'Nguyễn An',
            roles: ['LANDLORD'],
            authorities: ['ROLE_LANDLORD'],
            accessToken: 'local-simulation-only',
          }),
        ),
      );
      await page.goto(`${base}/tin-cua-toi`);
      await page.getByRole('button', { name: 'Tạo tin đăng', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog
        .locator('select[formcontrolname="propertyId"] option')
        .last()
        .waitFor({ state: 'attached' });
      await dialog.locator('select[formcontrolname="propertyId"]').selectOption(propertyId);
      await dialog.locator('input[formcontrolname="title"]').fill(`Đăng tin kèm Boost ${label}`);
      await dialog.getByRole('radio', { name: /Gói Boost đã mua/ }).check();
      await dialog.locator('select[formcontrolname="boostSubscriptionId"]').selectOption(group);
      assert.match(
        await dialog
          .locator('select[formcontrolname="boostPriorityLevel"] option:checked')
          .textContent(),
        level === 2 ? /Ưu tiên cao/ : /Ưu tiên thấp/,
      );
      await dialog.getByText('Sau khi đăng:', { exact: false }).waitFor();
      if (label === 'desktop') {
        await fetch(`${api}/test/listing-boost-fail-next`, { method: 'POST' });
        await dialog.getByRole('button', { name: 'Tạo và gửi duyệt', exact: true }).click();
        await dialog
          .getByRole('alert')
          .getByText('Gói Boost đã hết lượt ưu tiên cao.', { exact: false })
          .waitFor();
        assert.equal(
          await dialog.locator('input[formcontrolname="title"]').inputValue(),
          `Đăng tin kèm Boost ${label}`,
        );
        await dialog.getByRole('button', { name: 'Tải lại dữ liệu', exact: true }).click();
        await dialog.getByRole('alert').waitFor({ state: 'hidden' });
        await dialog.locator('fieldset').waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
      }
      assert.equal(
        await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
        true,
      );
      await dialog.locator('.priority-section').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/screenshots/listing_boost_${label}.png` });
      const posted = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' && response.url().endsWith('/api/listings'),
      );
      await dialog.getByRole('button', { name: 'Tạo và gửi duyệt', exact: true }).click();
      const response = await posted;
      assert.equal(response.status(), 200);
      const payload = response.request().postDataJSON();
      assert.equal(payload.propertyId, propertyId);
      assert.equal(payload.boostSubscriptionId, group);
      assert.equal(payload.boostPriorityLevel, level);
      assert.equal(payload.priorityLevel, 0);
      await dialog.waitFor({ state: 'hidden' });
      const article = page.locator('article').filter({ hasText: `Đăng tin kèm Boost ${label}` });
      await article.getByText('Boost đã chọn:', { exact: false }).waitFor();
      await article
        .getByText('Lượt đã trừ, áp dụng hiển thị sau khi được duyệt.', { exact: false })
        .waitFor();
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      'PASS: real Angular desktop/mobile Boost selection, low-level fallback, stale-credit error preserves form, atomic create payload, pending Boost display; synthetic Postman API.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
