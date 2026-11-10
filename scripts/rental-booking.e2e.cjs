// Run only against a freshly created, isolated DB seeded by V2. Does not modify the application DB.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const api=process.env.RENTAL_E2E_API||'http://127.0.0.1:18080/api';
const site=process.env.RENTAL_E2E_SITE||'http://127.0.0.1:4217';
async function call(path,session,method='GET',body) {
  const response=await fetch(api+path,{method,headers:{...(session?{Authorization:`Bearer ${session.accessToken}`} : {}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const result=await response.json();assert(response.ok,`${method} ${path}: ${response.status} ${result.message}`);return result.data;
}
async function login(email){return call('/auth/login',null,'POST',{email,password:'TroTotDemo@2026'});}
(async()=>{
  assert.equal(process.env.RENTAL_E2E_ISOLATED,'true','Explicitly confirm an isolated test DB before running');
  const owner=await login('landlord.hanoi@trotot.example.test');
  const tenant=await login('tenant.an@trotot.example.test');
  const stranger=await login('tenant.binh@trotot.example.test');
  const admin=await login('admin.demo@trotot.example.test');
  const properties=await call('/properties/mine',owner);
  const property=properties.data.find(p=>p.rentalMode==='BY_ROOM'&&p.rooms.some(r=>r.bookingAvailability==='AVAILABLE'));
  assert(property,'Seed must contain a bookable BY_ROOM property');
  const room=property.rooms.find(r=>r.bookingAvailability==='AVAILABLE');
  const listing=await call('/listings',owner,'POST',{propertyId:property.id,title:'[E2E] Đặt phòng và hợp đồng',description:'Tin thử nghiệm tự động trong database riêng.'});
  await call(`/listings/${listing.id}/approve`,admin,'POST');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  fs.mkdirSync('docs/screenshots',{recursive:true});const errors=[];
  try {
    async function pageFor(session){const page=await browser.newPage({viewport:{width:1360,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(s=>localStorage.setItem('trotot_auth',JSON.stringify(s)),session);return page;}
    const guest=await browser.newPage();await guest.goto(`${site}/tro/${listing.id}`);await guest.getByRole('button',{name:'Đặt phòng',exact:true}).click();await guest.waitForURL(/\/login\?redirect=/);await guest.close();
    const t=await pageFor(tenant);await t.goto(`${site}/tro/${listing.id}?phong=${room.id}`);
    await t.getByRole('button',{name:'Đặt phòng',exact:true}).click();
    await t.waitForURL(new RegExp(`/tro/${listing.id}/dat-phong/${room.id}$`));
    const form=t.locator('app-booking-dialog');await form.locator('[formcontrolname="tenantFullName"]').fill('[Mẫu] Khách kiểm thử');
    await form.locator('[formcontrolname="tenantPhone"]').fill('0912345678');
    await form.locator('[formcontrolname="tenantCitizenId"]').fill('012345678901');
    await form.locator('[formcontrolname="tenantPermanentAddress"]').fill('Địa chỉ tổng hợp phục vụ kiểm thử');
    const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
    await form.locator('[formcontrolname="proposedMoveInDate"]').fill(tomorrow);
    await form.locator('[formcontrolname="acceptedPrivacyNotice"]').check();
    const submitted=t.waitForResponse(r=>r.url().endsWith('/api/rental-requests')&&r.request().method()==='POST');
    await form.getByRole('button',{name:'Gửi yêu cầu thuê phòng',exact:true}).click();
    const response=await submitted;assert.equal(response.status(),201);const request=(await response.json()).data;
    await t.waitForURL(/\/yeu-cau-thue$/);await t.locator('.status-badge[data-status="PENDING"]').waitFor();
    const o=await pageFor(owner);await o.goto(`${site}/quan-ly-dat-phong`);await o.getByRole('button',{name:'Chấp nhận',exact:true}).waitFor();
    await o.screenshot({path:'docs/screenshots/rental_landlord_approval.png',fullPage:true});
    await o.getByRole('button',{name:'Chấp nhận',exact:true}).click();await o.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).click();
    await o.waitForURL(/\/hop-dong\//);const agreementId=o.url().split('/').pop();
    const forbidden=await fetch(`${api}/rental-agreements/${agreementId}/pdf`,{headers:{Authorization:`Bearer ${stranger.accessToken}`}});assert.equal(forbidden.status,403);
    await t.getByRole('button',{name:'Tải lại',exact:true}).click();await t.getByRole('link',{name:/Xem hợp đồng/}).click();
    await t.locator('app-contract-pdf-viewer canvas').waitFor({timeout:60000});assert.equal(await t.getByRole('button',{name:'Xác nhận thuê',exact:true}).isEnabled(),false);
    await t.getByRole('checkbox',{name:/Tôi đã đọc và đồng ý/}).check();
    await t.getByRole('button',{name:'Xác nhận thuê',exact:true}).click();await t.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).click();
    await t.getByText('Đã xác nhận thuê',{exact:true}).waitFor();
    const contract=await call(`/rental-agreements/${agreementId}`,tenant);assert.equal(contract.status,'ACTIVE');assert(contract.pdfSha256);
    const rooms=await call(`/listings/${listing.id}/bookable-rooms`);assert.equal(rooms.find(r=>r.id===room.id).bookingAvailability,'RENTED');
    assert.equal(await t.getByRole('button',{name:'Xác nhận thuê',exact:true}).count(),0);
    await t.setViewportSize({width:390,height:844});await t.evaluate(()=>scrollTo(0,0));
    assert(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile must not overflow');
    await t.screenshot({path:'docs/screenshots/rental_tenant_active_mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: real JWT/API/MySQL booking, landlord approval, private Cloudinary PDF, tenant confirmation, RENTED availability, IDOR rejection, anonymous login redirect and mobile layout.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error.message);process.exit(1);});
