const assert=require('assert');const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('trotot_auth',JSON.stringify({id:'admin',email:'admin@example.test',fullName:'Quản trị viên',phone:'',status:'ACTIVE',roles:['ADMIN'],authorities:['ROLE_ADMIN'],accessToken:'local-simulation-only',refreshToken:''})));
 await page.goto('http://127.0.0.1:4207/admin/property-types');await page.getByRole('heading',{name:'Loại cơ sở cho thuê',exact:true}).waitFor();
 await page.getByLabel('Tên loại cơ sở *',{exact:true}).fill('Chung cư mini kiểm thử');await page.getByLabel('Mô tả',{exact:true}).fill('Cơ sở nhiều tầng');await page.getByRole('button',{name:'Lưu loại cơ sở',exact:true}).click();await page.getByRole('cell',{name:'Chung cư mini kiểm thử',exact:true}).waitFor();
 await page.getByRole('button',{name:'Sửa Chung cư mini kiểm thử',exact:true}).click();await page.getByLabel('Tên loại cơ sở *',{exact:true}).fill('Chung cư mini An Bình');await page.getByRole('button',{name:'Lưu loại cơ sở',exact:true}).click();await page.getByRole('cell',{name:'Chung cư mini An Bình',exact:true}).waitFor();
 await page.screenshot({path:'.angular/property-admin.png',fullPage:true});
 await page.getByRole('button',{name:'Xóa Chung cư mini An Bình',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();await page.getByRole('cell',{name:'Chung cư mini An Bình',exact:true}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Xóa Nhà trọ',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();await page.getByRole('alert').filter({hasText:'đang được sử dụng'}).waitFor();assert.equal(await page.getByRole('cell',{name:'Nhà trọ',exact:true}).count(),1);
 assert.deepEqual(errors,[]);console.log('PASS: Admin property-type create, edit, delete, in-use 409 retention, no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
