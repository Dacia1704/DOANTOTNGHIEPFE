// Production Angular + a real local BE. This is a test server, not an API simulation.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('dist/library-frontend/browser');
const port = Number(process.env.RENTAL_PREVIEW_PORT || 4217);
const backend = Number(process.env.RENTAL_BACKEND_PORT || 18080);
http.createServer((req,res)=>{
  if(req.url.startsWith('/api/')) {
    const proxy=http.request({hostname:'127.0.0.1',port:backend,path:req.url,method:req.method,headers:req.headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res);});
    proxy.on('error',()=>{res.writeHead(502);res.end('Local rental backend unavailable');});req.pipe(proxy);return;
  }
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  let file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Rental production preview: http://127.0.0.1:${port}`));
