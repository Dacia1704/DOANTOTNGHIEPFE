// Run the production Angular build against rental-agreement-ui.sim.yaml.
// Synthetic roles establish UI behavior, not real JWT authorization or database transitions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const site = process.env.RENTAL_UI_SITE || 'http://127.0.0.1:4227';
const api = process.env.RENTAL_UI_API || 'http://127.0.0.1:4917/api';
const shots = 'docs/screenshots';
async function control(route, body) {
  const res = await fetch(api + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  assert.equal(res.status, 200, route);
}
(async () => {
  await control('/test/reset');
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  async function pageFor(role) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
      acceptDownloads: true,
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(
      (role) =>
        localStorage.setItem(
          'trotot_auth',
          JSON.stringify({
            id: role === 'LANDLORD' ? 'owner' : 'tenant',
            fullName: role === 'LANDLORD' ? 'Trần Thị Hồng' : 'Nguyễn Văn An',
            email: 'demo@example.test',
            phone: '',
            status: 'ACTIVE',
            roles: [role],
            authorities: ['ROLE_' + role],
            accessToken: role === 'LANDLORD' ? 'ui-owner' : 'ui-tenant',
            refreshToken: '',
          }),
        ),
      role,
    );
    return page;
  }
  async function loaded(page) {
    await page.locator('app-contract-pdf-viewer canvas').waitFor();
    await page.waitForFunction(() => {
      const canvas = document.querySelector('app-contract-pdf-viewer canvas');
      const stage = document.querySelector('app-contract-pdf-viewer .pdf-stage');
      return canvas?.width > 0 && stage?.getAttribute('aria-busy') === 'false';
    });
    await page
      .locator('.sr-only')
      .filter({ hasText: 'HỢP ĐỒNG THUÊ PHÒNG TRỌ' })
      .waitFor({ state: 'attached' });
  }
  async function fits(page) {
    await page.waitForFunction(() => {
      const canvas = document.querySelector('app-contract-pdf-viewer canvas');
      const stage = document.querySelector('app-contract-pdf-viewer .pdf-stage');
      return canvas && stage && canvas.getBoundingClientRect().width <= stage.clientWidth - 16;
    });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      'Page must not overflow horizontally',
    );
  }
  try {
    const tenant = await pageFor('TENANT');
    await control('/test/corrupt-pdf', { enabled: true });
    await tenant.goto(site + '/hop-dong/contract-demo');
    await tenant.getByRole('alert').filter({ hasText: 'Không tải/xác minh được PDF' }).waitFor();
    assert.equal(
      await tenant.getByRole('button', { name: 'Xác nhận thuê', exact: true }).isEnabled(),
      false,
    );
    assert.equal(await tenant.locator('app-contract-pdf-viewer').count(), 0);
    await control('/test/corrupt-pdf', { enabled: false });
    await tenant.getByRole('button', { name: 'Tải lại', exact: true }).click();
    await loaded(tenant);
    await fits(tenant);
    assert.equal(await tenant.getByRole('checkbox').isEnabled(), true);
    assert.equal(
      await tenant.getByRole('button', { name: 'Xác nhận thuê', exact: true }).isEnabled(),
      false,
    );
    const viewer = tenant.locator('app-contract-pdf-viewer');
    await viewer.getByRole('button', { name: 'Trang PDF tiếp theo', exact: true }).click();
    await tenant.waitForFunction(
      () =>
        document.querySelector('.page-label strong')?.textContent === '2' &&
        document.querySelector('.pdf-stage')?.getAttribute('aria-busy') === 'false',
    );
    assert((await viewer.locator('.sr-only').textContent()).includes('4. Điều khoản thực hiện'));
    await viewer.getByRole('button', { name: 'Trang PDF trước', exact: true }).click();
    await loaded(tenant);
    await viewer.getByRole('button', { name: 'Phóng to PDF', exact: true }).click();
    await tenant.waitForFunction(
      () =>
        document.querySelector('.zoom-label')?.textContent === '125%' &&
        document.querySelector('.pdf-stage')?.getAttribute('aria-busy') === 'false',
    );
    await viewer.getByRole('button', { name: 'Vừa chiều rộng trang', exact: true }).click();
    await fits(tenant);
    const downloadEvent = tenant.waitForEvent('download');
    await tenant.getByRole('button', { name: 'Tải hợp đồng PDF', exact: true }).click();
    const download = await downloadEvent;
    fs.mkdirSync('.angular/agreement-preview', { recursive: true });
    const downloadPath = '.angular/agreement-preview/verified-download.pdf';
    await download.saveAs(downloadPath);
    assert(
      fs
        .readFileSync(downloadPath)
        .equals(fs.readFileSync('postman/mocks/rental-agreements/contract-demo.pdf')),
    );
    await tenant.evaluate(() => scrollTo(0, 0));
    await tenant.screenshot({
      path: path.join(shots, 'contract_tenant_desktop.png'),
      fullPage: true,
    });
    await tenant.setViewportSize({ width: 390, height: 844 });
    await fits(tenant);
    await tenant.evaluate(() => scrollTo(0, 0));
    await tenant.screenshot({
      path: path.join(shots, 'contract_tenant_mobile.png'),
      fullPage: true,
    });
    await tenant.getByRole('checkbox', { name: /Tôi đã đọc và đồng ý/ }).check();
    await tenant.getByRole('button', { name: 'Xác nhận thuê', exact: true }).click();
    await tenant.getByRole('dialog').getByRole('button', { name: 'Quay lại', exact: true }).click();
    assert.equal(await tenant.getByRole('checkbox').isChecked(), true);
    await tenant.getByRole('button', { name: 'Xác nhận thuê', exact: true }).click();
    await tenant.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await tenant.locator('.agreement-banner').filter({ hasText: 'Đã xác nhận thuê' }).waitFor();
    assert.equal(await tenant.getByRole('checkbox').count(), 0);

    const owner = await pageFor('LANDLORD');
    await owner.goto(site + '/hop-dong/contract-demo');
    await loaded(owner);
    await fits(owner);
    assert.equal(await owner.getByRole('checkbox').count(), 0);
    assert.equal(
      await owner
        .getByRole('button', { name: 'Xác nhận hoàn tất trả phòng', exact: true })
        .isEnabled(),
      true,
    );
    await owner.screenshot({
      path: path.join(shots, 'contract_landlord_desktop.png'),
      fullPage: true,
    });
    await owner.goto(site + '/quan-ly-dat-phong');
    await owner.getByRole('button', { name: 'Hợp đồng', exact: true }).click();
    await owner.locator('.agreement-card').first().waitFor();
    assert.equal(await owner.locator('.agreement-card').count(), 3);
    await owner.screenshot({
      path: path.join(shots, 'contracts_landlord_list.png'),
      fullPage: true,
    });
    await owner.setViewportSize({ width: 390, height: 844 });
    assert(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await owner.getByRole('link', { name: 'Xem hợp đồng', exact: true }).first().click();
    await loaded(owner);
    await fits(owner);
    await owner.getByRole('button', { name: 'Xác nhận hoàn tất trả phòng', exact: true }).click();
    await owner.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await owner.locator('.agreement-banner').filter({ hasText: 'Đã trả phòng' }).waitFor();
    assert.equal(
      await owner.getByRole('button', { name: 'Xác nhận hoàn tất trả phòng', exact: true }).count(),
      0,
    );

    await tenant.goto(site + '/hop-dong/contract-processing');
    await tenant.getByRole('heading', { name: 'Đang tạo hợp đồng PDF', exact: true }).waitFor();
    assert.equal(await tenant.getByRole('checkbox').count(), 0);
    await tenant.goto(site + '/hop-dong/contract-failed');
    await tenant.getByRole('heading', { name: 'Chưa thể tạo hợp đồng', exact: true }).waitFor();
    await tenant.getByRole('button', { name: 'Kiểm tra lại', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      'PASS: production Angular, both roles, verified Jasper PDF, responsive fit, pagination/zoom, exact-byte download, hash mismatch block/retry, confirm dialog/cancel, active/checkout, list, processing/failed states, 390px layout, no runtime errors. Synthetic API only.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
