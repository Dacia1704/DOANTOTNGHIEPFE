const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.resolve('dist/library-frontend/browser');
http.createServer((req,res)=>{
 if(req.url.startsWith('/api')){const proxy=http.request({hostname:'127.0.0.1',port:4907,path:req.url,method:req.method,headers:req.headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res)});proxy.on('error',()=>{res.writeHead(502);res.end('Simulation unavailable')});req.pipe(proxy);return;}
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');const ext=path.extname(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'}[ext]||'application/octet-stream')});fs.createReadStream(file).pipe(res);
}).listen(4207,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:4207'));
