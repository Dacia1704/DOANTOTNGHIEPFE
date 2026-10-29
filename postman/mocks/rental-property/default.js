// UI-only simulation derived from DOANTOTNGHIEPBE/docs/PROPERTY_API.md.
// Synthetic fixtures stay here; production Angular services always use the actual API.
const http = require('http');
const crypto = require('crypto');
const stamp = '2026-10-27T10:00:00';
const amenities = [{id:'wifi',name:'WiFi chung',icon:'wifi'},{id:'parking',name:'Chỗ để xe',icon:'local_parking'},{id:'ac',name:'Điều hòa',icon:'ac_unit'}];
const types = [{id:'pt',name:'Nhà trọ',description:'Cơ sở nhiều phòng'},{id:'pt-house',name:'Nhà riêng',description:''}];
const roomTypes = [{id:'root-room',name:'Phòng trọ',description:'Nhóm phòng cho thuê',parentId:null},{id:'rt',name:'Phòng khép kín',description:'',parentId:'root-room'},{id:'studio',name:'Studio',description:'',parentId:'root-room'},{id:'house-type',name:'Nhà nguyên căn',description:'',parentId:null}];
const location = {landlordId:'owner',provinceId:'p',provinceName:'Hà Nội',wardId:'w',wardName:'Phường Bạch Mai',addressLine:'18 ngõ 27 Đại La',latitude:null,longitude:null};
function room(id, number, floor, status, price) {return {id,propertyId:'p1',roomNumber:number,floorNumber:floor,roomTypeId:'rt',roomTypeName:'Phòng khép kín',price,electricityPrice:3500,waterPrice:null,serviceFee:100000,defaultDeposit:price,areaM2:25,maxOccupants:2,rentalStatus:status,amenities:[amenities[2]],images:[],createdAt:stamp,updatedAt:stamp,...location};}
function seed() {return [
 {id:'p1',name:'Nhà trọ An Nhiên',propertyTypeId:'pt',propertyTypeName:'Nhà trọ',rentalMode:'BY_ROOM',totalFloors:3,...location,amenities:amenities.slice(0,2),images:[],rooms:[room('r1','A101',1,'AVAILABLE',3000000),room('r2','A102',1,'RENTED',3000000),room('r3','B201',2,'AVAILABLE',3500000),room('r4','B202',2,'MAINTENANCE',3200000),room('r5','G01',0,'AVAILABLE',2800000),room('r6','P01',null,'AVAILABLE',2500000)],createdAt:stamp,updatedAt:stamp},
 {id:'p2',name:'Căn nhà Vườn Xanh',propertyTypeId:'pt-house',propertyTypeName:'Nhà riêng',rentalMode:'WHOLE',totalFloors:2,...location,addressLine:'42 phố Vọng',amenities:[],images:[],rooms:[{...room('whole','WHOLE',null,'AVAILABLE',12000000),propertyId:'p2',roomTypeId:'house-type',roomTypeName:'Nhà nguyên căn',addressLine:'42 phố Vọng',areaM2:100,maxOccupants:6}],createdAt:stamp,updatedAt:stamp}
];}
const page = (items, query) => {const currentPage=Number(query.page||0),pageSize=Number(query.size||10);return {currentPage,pageSize,totalPages:Math.ceil(items.length/pageSize),totalElements:items.length,data:items.slice(currentPage*pageSize,(currentPage+1)*pageSize)};};
http.createServer(async (req,res) => {
 const url=new URL(req.url,'http://local'), path=url.pathname, query=req.query||Object.fromEntries(url.searchParams);
 const send=(data,code=200,message='Thành công')=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({code,message,data}));};
 // REST chat fixture from the existing BE ChatController/response DTOs. No booking API.
 if(path.startsWith('/chat/')) {
   if(!req.headers.authorization) return send(null,401,'Vui lòng đăng nhập');
   const owner={id:'owner',fullName:'Nguyễn An',avatarUrl:null,roles:['LANDLORD']};
   const admin={id:'admin',fullName:'Hỗ trợ Trọ Tốt',avatarUrl:null,roles:['ADMIN']};
   let conversations=await pm.state.get('rental-property.chats')||[];
   if(path==='/chat/conversations' && req.method==='GET') return send(conversations);
   if(req.method==='POST' && (path==='/chat/conversations/support'||path.startsWith('/chat/conversations/listing/'))) {
     const support=path.endsWith('/support'), listingId=path.split('/').pop();
     if(!support && !['post-0','post-whole'].includes(listingId)) return send(null,404,'Tin đăng không tồn tại');
     let item=conversations.find(c=>support?!c.listing:c.listing?.id===listingId);
     if(!item) {item={id:support?'support-chat':'listing-chat-'+listingId,otherUser:support?admin:owner,listing:support?null:{id:listingId,title:listingId==='post-whole'?'Nhà nguyên căn Vườn Xanh':'Phòng sáng thoáng gần Đại học Bách Khoa'},lastMessage:null,lastMessageAt:null,unreadCount:0};conversations.push(item);await pm.state.set('rental-property.chats',conversations);}
     return send(item);
   }
   const match=path.match(/^\/chat\/conversations\/([^/]+)\/(messages|read)$/);
   if(match) {
     if(!conversations.some(c=>c.id===match[1])) return send(null,404,'Cuộc trò chuyện không tồn tại');
     if(match[2]==='read' && req.method==='PUT') {conversations=conversations.map(c=>c.id===match[1]?{...c,unreadCount:0}:c);await pm.state.set('rental-property.chats',conversations);return send(null);}
     if(match[2]==='messages' && req.method==='GET') return send({currentPage:Number(query.page||0),pageSize:Number(query.size||30),totalPages:1,totalElements:1,data:[{id:'greeting-'+match[1],conversationId:match[1],sender:match[1]==='support-chat'?admin:owner,content:match[1]==='support-chat'?'Trọ Tốt có thể hỗ trợ gì cho bạn?':'Chào bạn, bạn muốn hỏi về phòng nào?',messageType:'TEXT',createdAt:stamp}]});
   }
   return send(null,501,'Đường dẫn chat chưa được mô phỏng');
 }
 let properties=await pm.state.get('rental-property.properties');if(!properties){properties=seed();await pm.state.set('rental-property.properties',properties);}
 let catalog=await pm.state.get('rental-property.types')||types;
 if(path==='/test/reset' && req.method==='POST'){await pm.state.set('rental-property.properties',seed());await pm.state.set('rental-property.types',types);return send(null);}
 if(path==='/test/fail-next' && req.method==='POST'){await pm.state.set('rental-property.failNext',true);return send(null);}
 // Listing endpoints expose posts only, never synthesize one from every Room.
 let posts = await pm.state.get('rental-property.posts');
 if (!posts) {
   posts = ['PUBLISHED','PENDING','HIDDEN','REJECTED','EXPIRED'].map((status,index)=>({
     id:'post-'+index,propertyId:'p1',landlordId:'owner',title:['Phòng sáng thoáng gần Đại học Bách Khoa','Tin đang chờ duyệt','Tin đã ẩn','Tin bị từ chối','Tin đã hết hạn'][index],
     description:'Nội dung do chủ trọ đăng: phòng có cửa sổ, khu vực yên tĩnh.',status,priorityLevel:0,packagePriorityLevel:0,
     publishedAt:stamp,createdAt:stamp,pendingExpiresAt:new Date(Date.now()+7*86400000).toISOString(),
     expiresAt:new Date(Date.now()+(status==='EXPIRED'?-1:30)*86400000).toISOString(),
   }));
   posts.push({id:'post-whole',propertyId:'p2',landlordId:'owner',title:'Nhà nguyên căn Vườn Xanh',description:'Cho thuê toàn bộ căn nhà.',status:'PUBLISHED',priorityLevel:0,packagePriorityLevel:0,publishedAt:stamp,createdAt:stamp,expiresAt:new Date(Date.now()+30*86400000).toISOString()});
   await pm.state.set('rental-property.posts',posts);
 }
 const expandPost = post => { const property=properties.find(p=>p.id===post.propertyId); return {...post,property,propertyName:property?.name,rentalMode:property?.rentalMode,landlordName:'Nguyễn An'}; };
 const published = post => post.status==='PUBLISHED' && new Date(post.expiresAt)>new Date();
 if(path==='/listings/admin') return send(page(posts.filter(post=>!query.status||post.status===query.status).map(expandPost),query));
 if(path==='/listings/mine') return send(page(posts.map(expandPost),query));
 if(path==='/listings' && req.method==='POST') {
   const b=req.body; const property=properties.find(p=>p.id===b.propertyId);
   if(!property || !b.title?.trim())return send(null,400,'Cơ sở hoặc tiêu đề không hợp lệ');
   if(posts.some(post=>post.propertyId===property.id&&(published(post)||(post.status==='PENDING'&&new Date(post.pendingExpiresAt)>new Date()))))return send(null,409,'Cơ sở đã có bài đăng đang hiển thị hoặc chờ duyệt');
   const post={id:crypto.randomUUID(),propertyId:property.id,landlordId:'owner',title:b.title.trim(),description:b.description||'',status:'PENDING',priorityLevel:0,packagePriorityLevel:0,submittedAt:stamp,createdAt:stamp,pendingExpiresAt:new Date(Date.now()+7*86400000).toISOString()};
   posts.unshift(post);await pm.state.set('rental-property.posts',posts);return send(expandPost(post));
 }
 if(path==='/listings') {
   let records=posts.filter(published).map(expandPost).filter(post=>post.property);
   records=records.filter(post=>(!query.provinceId||post.property.provinceId===query.provinceId)&&(!query.wardId||post.property.wardId===query.wardId)&&post.property.rooms.some(room=>
     (!query.roomTypeName||room.roomTypeName.toLowerCase()===query.roomTypeName.toLowerCase())
     &&(!query.rentalStatus||room.rentalStatus===query.rentalStatus)
     &&(query.minPrice==null||room.price>=Number(query.minPrice))&&(query.maxPrice==null||room.price<=Number(query.maxPrice))));
   const unique=[...new Map(records.map(post=>[post.propertyId,post])).values()];
   return send(page(unique,query));
 }
 if(path.startsWith('/listings/') && req.method==='POST' && path.endsWith('/approve')) {
   const post=posts.find(p=>p.id===path.split('/')[2]);if(!post)return send(null,404,'Tin không tồn tại');
   post.status='PUBLISHED';post.publishedAt=stamp;post.expiresAt=new Date(Date.now()+30*86400000).toISOString();await pm.state.set('rental-property.posts',posts);return send(expandPost(post));
 }
 if(path.startsWith('/listings/')) {const post=posts.find(p=>p.id===path.split('/').pop());return post&&published(post)?send(expandPost(post)):send(null,404,'Tin đăng không còn hiệu lực');}
 if(path==='/provinces') return send([{id:'p',code:'HN',name:'Hà Nội'}]);
 if(path==='/wards') return send(page([{id:'w',provinceId:'p',code:'BM',name:'Phường Bạch Mai'}],query));
 let typeCatalog=await pm.state.get('rental-property.roomTypes')||roomTypes;
 if((path==='/room-types'||path==='/room-types/filter')&&req.method==='GET')return send(page(typeCatalog,query));
 if(path==='/room-types'&&req.method==='POST'){
  const b=req.body;if(typeCatalog.some(t=>t.name.toLowerCase()===b.name.trim().toLowerCase()))return send(null,409,'Tên loại phòng đã tồn tại');
  const record={id:crypto.randomUUID(),name:b.name.trim(),description:b.description||'',parentId:b.parentId||null};
  typeCatalog.push(record);await pm.state.set('rental-property.roomTypes',typeCatalog);return send(record);
 }
 if(path.startsWith('/room-types/')&&req.method==='PUT'){
  const id=path.split('/').pop();const record=typeCatalog.find(t=>t.id===id);if(!record)return send(null,404,'Loại phòng không tồn tại');
  Object.assign(record,req.body);await pm.state.set('rental-property.roomTypes',typeCatalog);return send(record);
 }
 if(path.startsWith('/room-types/')&&req.method==='DELETE'){
  const id=path.split('/').pop();if(typeCatalog.some(t=>t.parentId===id))return send(null,409,'Loại phòng có loại con, không thể xóa');
  if(properties.some(p=>p.rooms.some(r=>r.roomTypeId===id)))return send(null,409,'Loại phòng đang được sử dụng');
  await pm.state.set('rental-property.roomTypes',typeCatalog.filter(t=>t.id!==id));return send(null);
 }
 if(path.startsWith('/amenities')) return send(page(amenities,query));
 if(path==='/property-types' && req.method==='GET') return send(page(catalog,query));
 if(path==='/property-types' && req.method==='POST'){const body=req.body;const record={...body,id:crypto.randomUUID(),createdAt:stamp};catalog.push(record);await pm.state.set('rental-property.types',catalog);return send(record);}
 if(path.startsWith('/property-types/') && req.method==='PUT'){const id=path.split('/').pop();catalog=catalog.map(t=>t.id===id?{...t,...req.body}:t);await pm.state.set('rental-property.types',catalog);return send(catalog.find(t=>t.id===id));}
 if(path.startsWith('/property-types/') && req.method==='DELETE'){const id=path.split('/').pop();if(properties.some(p=>p.propertyTypeId===id))return send(null,409,'Loại bất động sản đang được sử dụng');await pm.state.set('rental-property.types',catalog.filter(t=>t.id!==id));return send(null);}
 if(path==='/properties/mine') return send(page(properties,query));
 if(path==='/properties' && req.method==='POST') {
  if(await pm.state.get('rental-property.failNext')){await pm.state.set('rental-property.failNext',false);return send(null,503,'Chưa lưu được cơ sở. Vui lòng thử lại.');}
  const b=req.body; const units=(b.floors||[]).flatMap(f=>(f.rooms||[]).map(r=>({...r,floorNumber:f.floorNumber})));
  if(!units.length || (b.rentalMode==='WHOLE' && units.length!==1))return send(null,400,'Số đơn vị không hợp lệ');
  if(new Set(units.map(r=>r.roomNumber.trim().toLowerCase())).size!==units.length)return send(null,409,'Số phòng bị trùng');
  const id=crypto.randomUUID();const base={...location,provinceId:b.provinceId,wardId:b.wardId,addressLine:b.addressLine,latitude:b.latitude??null,longitude:b.longitude??null};
  const records=units.map(r=>{const merged={};for(const key of ['roomTypeId','price','areaM2','maxOccupants','electricityPrice','waterPrice','serviceFee','defaultDeposit'])merged[key]=r[key]??b.defaultRoom?.[key]??null;return {...merged,...base,id:crypto.randomUUID(),propertyId:id,roomNumber:r.roomNumber,floorNumber:r.floorNumber,roomTypeName:roomTypes.find(t=>t.id===merged.roomTypeId)?.name,amenities:amenities.filter(a=>r.amenityIds?.includes(a.id)),images:[],rentalStatus:'AVAILABLE',createdAt:stamp,updatedAt:stamp};});
  if(records.some(r=>!r.roomTypeName||!(r.price>0)||!(r.areaM2>0)||!(r.maxOccupants>0)))return send(null,400,'Thông tin phòng không hợp lệ');
  const record={...base,id,name:b.name,rentalMode:b.rentalMode,totalFloors:b.totalFloors,propertyTypeId:b.propertyTypeId,propertyTypeName:catalog.find(t=>t.id===b.propertyTypeId)?.name,amenities:amenities.filter(a=>b.amenityIds?.includes(a.id)),images:[],rooms:records,createdAt:stamp,updatedAt:stamp};properties.unshift(record);await pm.state.set('rental-property.properties',properties);return send(record);
 }
 if(path.startsWith('/properties/')){const property=properties.find(p=>p.id===path.split('/').pop());return property?send(property):send(null,404,'Cơ sở không tồn tại');}
 if(path.startsWith('/rooms/') && req.method==='PUT'){const id=path.split('/').pop();let found;for(const property of properties){property.rooms=property.rooms.map(r=>{if(r.id!==id)return r;found={...r,...req.body,amenities:amenities.filter(a=>req.body.amenityIds?.includes(a.id))};return found;});}await pm.state.set('rental-property.properties',properties);return found?send(found):send(null,404,'Phòng không tồn tại');}
 return send(null,501,'Đường dẫn chưa được mô phỏng');
}).listen(process.env.PORT||4500);
