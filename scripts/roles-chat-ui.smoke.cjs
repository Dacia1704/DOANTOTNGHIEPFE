// Browser regression checks with isolated API fixtures; never writes to application data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const site = process.env.ADMIN_UI_PREVIEW_URL || 'http://127.0.0.1:4220';
const codes = [
  'USER_READ',
  'USER_MANAGE',
  'REVIEW_READ',
  'REVIEW_MODERATE',
  'REPORT_READ',
  'REPORT_HANDLE',
  'ROLE_PERMISSION_READ',
  'ROLE_PERMISSION_MANAGE',
];
const names = [
  'Xem người dùng',
  'Quản lý người dùng',
  'Xem quản trị đánh giá',
  'Ẩn hiện đánh giá',
  'Xem hồ sơ báo cáo',
  'Xử lý báo cáo',
  'Xem phân quyền',
  'Quản lý phân quyền',
];
const permissions = codes.map((code, i) => ({
  id: `p${i}`,
  code,
  name: names[i],
  module: code.split('_')[0],
}));
const roles = [
  {
    id: 'admin',
    code: 'ADMIN',
    name: 'Quản trị viên',
    version: 0,
    permissionIds: permissions.map((p) => p.id),
    lockedPermissionIds: ['p6', 'p7'],
  },
  {
    id: 'landlord',
    code: 'LANDLORD',
    name: 'Chủ trọ',
    version: 0,
    permissionIds: ['p2'],
    lockedPermissionIds: ['p1', 'p6', 'p7'],
  },
  {
    id: 'tenant',
    code: 'TENANT',
    name: 'Người thuê',
    version: 0,
    permissionIds: [],
    lockedPermissionIds: ['p1', 'p6', 'p7'],
  },
];
const conversations = Array.from({ length: 18 }, (_, i) => ({
  id: `c${i}`,
  otherUser: {
    id: `u${i}`,
    fullName: `Người dùng ${String(i + 1).padStart(2, '0')}`,
    avatarUrl: null,
    roles: ['TENANT'],
  },
  listing: null,
  lastMessage: null,
  lastMessageAt: `2026-11-09T${String(23 - i).padStart(2, '0')}:00:00`,
  unreadCount: 1,
}));
const authorities = ['ROLE_ADMIN', ...codes];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [],
    audit = [];
  let patches = 0,
    inboxRequests = 0,
    conflict = false,
    readOnly = false;
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((s) => localStorage.setItem('trotot_auth', JSON.stringify(s)), {
    id: 'admin',
    fullName: 'Quản trị viên',
    email: 'fixture@example.test',
    roles: ['ADMIN'],
    authorities,
    accessToken: 'local-fixture-only',
    refreshToken: '',
    status: 'ACTIVE',
  });
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    const ok = (data) => route.fulfill({ json: { code: 200, message: 'OK', data } });
    if (path === '/api/users/me/authorities')
      return ok(readOnly ? authorities.filter((p) => p !== 'ROLE_PERMISSION_MANAGE') : authorities);
    if (path === '/api/admin/role-permissions') return ok({ permissions, roles });
    if (path === '/api/admin/role-permissions/audit') return ok(audit);
    if (/\/api\/admin\/roles\/[^/]+\/permissions\/[^/]+/.test(path)) {
      patches++;
      const [, roleId, permissionId] = path.match(/roles\/([^/]+)\/permissions\/([^/]+)/),
        body = req.postDataJSON(),
        role = roles.find((r) => r.id === roleId);
      assert(!role.lockedPermissionIds.includes(permissionId));
      assert.equal(body.expectedVersion, role.version);
      if (conflict) {
        conflict = false;
        role.version++;
        return route.fulfill({ status: 409, json: { message: 'Phiên bản quyền đã thay đổi' } });
      }
      role.permissionIds = body.enabled
        ? [...role.permissionIds, permissionId]
        : role.permissionIds.filter((id) => id !== permissionId);
      role.version++;
      audit.unshift({
        id: `audit-${patches}`,
        actor_id: 'admin',
        actor_name: 'Quản trị viên',
        role_id: role.id,
        role_code: role.code,
        permission_id: permissionId,
        permission_code: permissions.find((p) => p.id === permissionId).code,
        old_enabled: !body.enabled,
        new_enabled: body.enabled,
        role_version: role.version,
        created_at: '2026-11-09T10:00:00',
      });
      return ok({ roleId, permissionId, enabled: body.enabled, version: role.version });
    }
    if (path === '/api/chat/conversations') {
      inboxRequests++;
      return ok(conversations);
    }
    if (/\/api\/chat\/conversations\/c\d+\/messages/.test(path))
      return ok({ data: [], currentPage: 0, pageSize: 30, totalPages: 0, totalElements: 0 });
    if (path.endsWith('/read')) return ok(null);
    return ok([]);
  });
  fs.mkdirSync('docs/screenshots', { recursive: true });
  async function screenshot(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelector('mat-sidenav-content')?.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  try {
    await page.goto(`${site}/admin/roles`);
    await page.getByRole('checkbox').first().waitFor();
    assert.equal(await page.getByRole('checkbox').count(), 24);
    const protectedCells = page.getByRole('checkbox', { name: /Quyền được bảo vệ/ });
    assert.equal(await protectedCells.count(), 8);
    assert(await protectedCells.first().isDisabled());
    const row = page.getByRole('row').filter({ has: page.getByText('USER_READ', { exact: true }) });
    const tenantRead = row.getByRole('checkbox', {
      name: 'Xem người dùng · Người thuê',
      exact: true,
    });
    await tenantRead.click();
    await page.getByRole('status').filter({ hasText: 'Đã cấp' }).waitFor();
    assert.equal(roles[2].version, 1);
    assert(roles[2].permissionIds.includes('p0'));
    await page.locator('.audit-panel summary').click();
    await page.getByText('Đã cấp quyền', { exact: true }).waitFor();
    await screenshot('roles-admin-desktop');
    await page.getByRole('searchbox').fill('chủ trọ');
    assert.equal(await page.getByRole('checkbox').count(), 8);
    await page.getByRole('searchbox').fill('Không có dữ liệu');
    await page.getByText('Không có kết quả phù hợp', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
    conflict = true;
    await tenantRead.click();
    await page.getByRole('alert').filter({ hasText: 'Phân quyền đã thay đổi' }).waitFor();
    await page.getByRole('checkbox').first().waitFor();
    assert(await tenantRead.isChecked());
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot('roles-admin-mobile');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    readOnly = true;
    await page.getByRole('button', { name: 'Tải lại phân quyền', exact: true }).click();
    await page
      .locator('.toolbar-hint')
      .filter({ hasText: 'Bạn đang xem phân quyền ở chế độ chỉ đọc' })
      .waitFor();
    assert.equal(await page.locator('input[type=checkbox]:enabled').count(), 0);
    readOnly = false;
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${site}/admin/messages`);
    await page.locator('.conversation').nth(17).waitFor();
    const list = page.locator('.conversation-items');
    const order = await page.locator('.conversation-name').allTextContents();
    await list.evaluate((el) => {
      el.scrollTop = 350;
    });
    const user = page.locator('.conversation').nth(5);
    await user.click();
    await page.waitForURL(/conversation=c5/);
    const position = await list.evaluate((el) => el.scrollTop);
    await page.waitForTimeout(300);
    assert(
      Math.abs((await list.evaluate((el) => el.scrollTop)) - position) <= 1,
      'Selecting a user must preserve the inbox scroll position',
    );
    assert.deepEqual(await page.locator('.conversation-name').allTextContents(), order);
    assert.equal(inboxRequests, 1);
    await page.locator('.conversation').nth(6).click();
    await page.waitForURL(/conversation=c6/);
    assert.deepEqual(await page.locator('.conversation-name').allTextContents(), order);
    assert.equal(inboxRequests, 1);
    await screenshot('chat-stable-order-desktop');
    assert.deepEqual(errors, []);
    console.log(
      'PASS: 3-role matrix, locked cells, versioned edits, audit, role/permission search, 409 refresh, read-only access, mobile overflow and stable conversation order/scroll.',
    );
  } catch (error) {
    console.log('Failure:', error.message);
    console.log('Page runtime errors:', errors);
    console.log(
      'Effective authorities:',
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('trotot_auth') || '{}').authorities,
      ),
    );
    console.log(
      'Matrix feedback:',
      await page
        .locator('.roles-page')
        .innerText({ timeout: 1000 })
        .catch(() => 'Not on matrix page'),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
