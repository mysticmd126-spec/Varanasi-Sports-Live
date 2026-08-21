const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// Load the local .env file when the server is started with `node server.js` as well as `npm start`.
// Existing environment variables always win.
function loadDotEnv(file){
  try{
    const text=fs.readFileSync(file,'utf8');
    for(const line of text.split(/\r?\n/)){
      const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if(!m || Object.prototype.hasOwnProperty.call(process.env,m[1])) continue;
      let v=m[2]; if((v.startsWith('\"')&&v.endsWith('\"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
      process.env[m[1]]=v;
    }
  }catch{}
}
const ROOT = __dirname;
loadDotEnv(path.join(ROOT,'.env'));
const PUBLIC = ROOT;
const DATA_FILE = path.join(ROOT, 'data', 'site.json');
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const sessions = new Map();
const SESSION_TTL = 2 * 60 * 60 * 1000;
const MAX_BODY = 1024 * 1024;

function loadData(){ return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }
function saveData(data){
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data,null,2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}
function parseCookies(req){
  const out={};
  (req.headers.cookie||'').split(';').forEach(x=>{const i=x.indexOf('=');if(i>0)out[x.slice(0,i).trim()]=decodeURIComponent(x.slice(i+1).trim())});
  return out;
}
function timingSafeHex(a,b){
  const A=Buffer.from(a,'hex'), B=Buffer.from(b,'hex');
  return A.length===B.length && crypto.timingSafeEqual(A,B);
}
function verifyPassword(password, stored){
  try{
    const [scheme,saltHex,hashHex]=String(stored||'').split('$');
    if(scheme!=='scrypt' || !saltHex || !hashHex) return false;
    const derived=crypto.scryptSync(password,Buffer.from(saltHex,'hex'),Buffer.from(hashHex,'hex').length,{N:16384,r:8,p:1,maxmem:32*1024*1024});
    return timingSafeHex(derived.toString('hex'),hashHex);
  }catch{return false}
}
function makeHash(password){
  const salt=crypto.randomBytes(16); const hash=crypto.scryptSync(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
if(process.argv[2]==='--hash'){
  const p=process.argv.slice(3).join(' ');
  if(!p){console.error('Usage: node server.js --hash "strong-password"');process.exit(1)}
  console.log(makeHash(p)); process.exit(0);
}
const PASSWORD_HASH=process.env.ADMIN_PASSWORD_HASH;
if(!PASSWORD_HASH){console.error('Missing ADMIN_PASSWORD_HASH. Copy .env.example and set a generated scrypt hash.');process.exit(1)}
function json(res,status,obj,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(obj));}
function securityHeaders(){return {'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};}
function sendFile(res,file){
  const ext=path.extname(file).toLowerCase(); const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
  res.writeHead(200,{...securityHeaders(),'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-store':'public, max-age=86400'});fs.createReadStream(file).pipe(res);
}
function readBody(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(Buffer.byteLength(b)>MAX_BODY){reject(new Error('too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch{reject(new Error('bad json'))}});req.on('error',reject)})}
function session(req){const sid=parseCookies(req).vsl_admin; if(!sid)return null; const s=sessions.get(sid); if(!s || s.expires<Date.now()){sessions.delete(sid);return null} s.expires=Date.now()+SESSION_TTL; return {sid,...s};}
function requireAdmin(req,res){const s=session(req);if(!s){json(res,401,{error:'Unauthorized'},securityHeaders());return null}return s}
function csrf(req,res,s){const token=req.headers['x-csrf-token'];if(!token || token!==s.csrf){json(res,403,{error:'CSRF validation failed'},securityHeaders());return false}return true}
setInterval(()=>{for(const [id,s] of sessions)if(s.expires<Date.now())sessions.delete(id)},15*60*1000).unref();

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`); const p=u.pathname;
    if(p==='/api/login' && req.method==='POST'){
      const body=await readBody(req);
      if(typeof body.username!=='string'||body.username!=='admin'||typeof body.password!=='string'||!verifyPassword(body.password,PASSWORD_HASH)) return json(res,401,{error:'Invalid credentials'},securityHeaders());
      const sid=crypto.randomBytes(32).toString('hex'), csrf=crypto.randomBytes(24).toString('hex'); sessions.set(sid,{csrf,expires:Date.now()+SESSION_TTL});
      const forwardedProto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim(); const isHttps=!!req.socket.encrypted || forwardedProto==='https'; const cookie=`vsl_admin=${sid}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL/1000}${isHttps?'; Secure':''}`;
      return json(res,200,{ok:true,csrf}, {...securityHeaders(),'Set-Cookie':cookie});
    }
    if(p==='/api/logout' && req.method==='POST'){
      const c=parseCookies(req);if(c.vsl_admin)sessions.delete(c.vsl_admin);return json(res,200,{ok:true}, {...securityHeaders(),'Set-Cookie':'vsl_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});
    }
    if(p==='/api/public-data' && req.method==='GET') return json(res,200,loadData(),securityHeaders());
    if(p==='/api/admin/data' && req.method==='GET'){
      const s=requireAdmin(req,res); if(!s)return; return json(res,200,{data:loadData(),csrf:s.csrf},securityHeaders());
    }
    if(p==='/api/admin/data' && req.method==='PUT'){
      const s=requireAdmin(req,res);if(!s)return;if(!csrf(req,res,s))return;const body=await readBody(req);if(!body||!body.site||!Array.isArray(body.events)||!Array.isArray(body.gallery)||!Array.isArray(body.packages))return json(res,400,{error:'Invalid data'},securityHeaders());saveData(body);return json(res,200,{ok:true},securityHeaders());
    }
    if(p==='/api/admin/session' && req.method==='GET'){
      const s=session(req);return json(res,200,{authenticated:!!s,csrf:s?.csrf||null},securityHeaders());
    }
    let file=path.join(PUBLIC,p==='/'?'index.html':p.slice(1));
    if(!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file=path.join(PUBLIC,'index.html');
    return sendFile(res,file);
  }catch(e){console.error(e);json(res,500,{error:'Server error'},securityHeaders())}
});
server.listen(PORT,()=>console.log(`Varanasi Sports Live secure site: http://localhost:${PORT}`));
