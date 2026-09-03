const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { Pool } = require('pg');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 10000);
const DATABASE_URL = process.env.DATABASE_URL;
const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const isProd = process.env.NODE_ENV === 'production';
const MAX_BODY = 15 * 1024 * 1024;
const SESSION_TTL = 2 * 60 * 60 * 1000;
const sessions = new Map();

if (!PASSWORD_HASH) {
  console.error('Missing ADMIN_PASSWORD_HASH environment variable.');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});
pool.on('error', err => console.error('PostgreSQL pool error:', err));

const DEFAULT_DATA = {
  site: {
    name: 'Varanasi Sports Live',
    email: '',
    phone: '9506117861',
    whatsapp: '9506117861',
    location: 'Varanasi, Uttar Pradesh, India',
    tagline: 'Professional Sports Broadcasting & Live Streaming',
    logo: '/assets/logo.png',
    mainImage: '/assets/sports-live-banner.png',
    mainImageCaption: 'Live Streaming & Multi-Camera Production',
    youtube: 'https://www.youtube.com/@VARANASISPORTSLIVE-h8p',
    footerText: 'Professional sports broadcasting, live streaming and digital sports coverage.'
  },
  home: {
    eyebrow: 'SPORTS BROADCASTING • VARANASI',
    title: 'Make your match look broadcast-grade.',
    description: 'Live sports coverage with multi-angle production, graphics, recording and event promotion built around your tournament.',
    primaryButton: 'Watch YouTube Channel',
    secondaryButton: 'Request a Quote',
    thirdButton: 'Upcoming Events',
    stat1Value: '11.2K', stat1Label: 'YouTube subscribers',
    stat2Value: '1,300+', stat2Label: 'Channel videos',
    stat3Value: '1.26M+', stat3Label: 'Channel views',
    trust1: '📡 Live Streaming', trust2: '🎥 Up to 4 Camera Angles', trust3: '🖥️ 4K-Capable Workflow', trust4: '🏏 Sports Focused'
  },
  showcase: {
    kicker: 'Brand & Production Showcase',
    title: 'One brand. Powerful sports visuals.',
    description: 'Show your brand, live production work and sports coverage in one professional portfolio.',
    logoImage: '/assets/logo.png',
    logoCaption: 'Official Varanasi Sports Live Brand',
    bannerImage: '/assets/sports-live-banner.png',
    bannerCaption: 'Broadcasting & Promotion Banner'
  },
  servicesSection: {
    kicker: 'What We Deliver', title: 'Everything around the live game.',
    description: 'Coverage, presentation, audience reach, sponsor visibility and post-event content.'
  },
  services: [
    {name:'Live Streaming', icon:'📡', description:'Stream matches and tournaments to your YouTube audience with a clean branded presentation.', features:'YouTube live integration\nStable encoder workflow\nLive / upcoming event links'},
    {name:'Multi-Camera Coverage', icon:'🎥', description:'Use different angles to follow the action instead of one static frame.', features:'Main / wide angle\nClose action angle\nMobile / sideline angle'},
    {name:'Score & Broadcast Graphics', icon:'📊', description:'Make the stream easier to follow and more valuable for sponsors and organisers.', features:'Scoreboard overlays\nTeam / player lower thirds\nSponsor placements'},
    {name:'Commentary & Audio', icon:'🎙️', description:'Optional commentary, venue sound and cleaner match audio.', features:'Commentator mic\nMatch / venue audio\nBasic mixing'},
    {name:'Highlights & Reels', icon:'⚡', description:'Turn one live event into more content for social media and sponsors.', features:'Key moments\nPlayer clips\nPost-match reels'},
    {name:'Event Promotion', icon:'🏆', description:'Use the website as your booking and promotion hub.', features:'Event landing pages\nGallery & portfolio\nQuote / booking form'}
  ],
  equipment: {
    kicker:'Production Setup', title:'The tech behind the coverage.', description:'Present your production capability professionally and update the setup as it evolves.',
    card1Title:'📱 Mobile Broadcast Kit', card1Description:'Flexible on-location capture for grounds where speed and mobility matter.', card1Tags:'Samsung S24 Ultra\niPhone 17 Pro\nTripods / mounts\nPower backup\nMobile internet',
    card2Title:'🖥️ Modified Streaming PC', card2Description:'Production workstation for multi-source switching, graphics, recording and streaming.', card2Tags:'4K-capable workflow\nMulti-source capture\nGraphics / overlays\nLocal recording\nEncoder software'
  },
  about: {
    kicker:'Why This Website', title:'Turn viewers into bookings.', description:'A professional website should prove that your sports broadcasting service is organised and ready to hire.',
    cardTitle:'Built for tournament organisers', cardDescription:'Give organisers one professional link they can send to clubs, teams, sponsors and venue partners.',
    features:'One-click YouTube channel access\nUpcoming event links\nPortfolio and gallery\nClear package starting prices\nDirect quote / booking form\nMobile-first design for WhatsApp sharing'
  },
  process: [
    {number:'01', name:'Brief', description:'Event date, sport, venue, duration and audience.'},
    {number:'02', name:'Plan', description:'Camera positions, audio, graphics, internet and crew.'},
    {number:'03', name:'Broadcast', description:'Capture, switch, brand, stream and record the event.'},
    {number:'04', name:'Deliver', description:'Archive, highlights, photos and promotional clips.'}
  ],
  cta: {kicker:'Ready to Broadcast?', title:"Let's make the game look bigger.", description:'Send your event details and get a professional production plan for your tournament.'},
  contact: {kicker:'Bookings', title:'Tell us about your event.', description:'Send your requirements and connect directly by WhatsApp or email.', directTitle:'Direct channels', coverage:'Local tournaments + travel assignments by requirement', sports:'Cricket\nFootball\nBadminton\nSchool / College Sports\nTournaments'},
  footer: {copyright:'Varanasi Sports Live. All rights reserved.'},
  events: [{title:'VARANASI SPORTS LIVE — YouTube Channel', date:'Live & scheduled streams', venue:'Online', link:'https://www.youtube.com/@VARANASISPORTSLIVE-h8p', image:'/assets/logo.png'}],
  gallery: [
    {url:'/assets/logo.png', caption:'Varanasi Sports Live — Brand Logo'},
    {url:'/assets/sports-live-banner.png', caption:'Live Streaming & Multi-Camera Production'}
  ],
  packages: [
    {name:'Mobile Starter', price:'₹3,999+', includes:'1 mobile setup, basic live stream, up to 4 hours'},
    {name:'Dual Angle', price:'₹7,999+', includes:'2 capture angles, operator, basic graphics, recording'},
    {name:'Pro 4-Camera', price:'₹14,999+', includes:'Up to 4 angles, streaming PC, graphics, recording'},
    {name:'Tournament', price:'₹24,999+', includes:'4-camera production, full-day coverage, custom requirements'}
  ],
  employees: []
};

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function mergeDefaults(base, incoming){
  if (!incoming || typeof incoming !== 'object') return clone(base);
  const out = clone(base);
  for (const [k,v] of Object.entries(incoming)) out[k] = v;
  return out;
}
function seedFromFile(){
  const candidates = [path.join(ROOT,'site.json'), path.join(ROOT,'data','site.json')];
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file,'utf8'));
      if (parsed && typeof parsed === 'object') return mergeDefaults(DEFAULT_DATA, parsed);
    } catch {}
  }
  return clone(DEFAULT_DATA);
}

async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS website_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const result = await pool.query('SELECT content FROM website_content WHERE id=1');
  if (!result.rowCount) {
    await pool.query('INSERT INTO website_content (id, content) VALUES (1, $1::jsonb)', [JSON.stringify(seedFromFile())]);
    console.log('PostgreSQL: created and seeded website_content.');
  } else {
    console.log('PostgreSQL: existing website content loaded.');
  }
}
async function loadData(){
  const r = await pool.query('SELECT content FROM website_content WHERE id=1');
  if (!r.rowCount) throw new Error('Website content row missing');
  return mergeDefaults(DEFAULT_DATA, r.rows[0].content);
}
async function saveData(data){
  const clean = mergeDefaults(DEFAULT_DATA, data);
  await pool.query(`INSERT INTO website_content (id, content, updated_at)
    VALUES (1, $1::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, updated_at=NOW()`, [JSON.stringify(clean)]);
  return clean;
}

function timingSafeHex(a,b){
  const A=Buffer.from(a,'hex'), B=Buffer.from(b,'hex');
  return A.length===B.length && crypto.timingSafeEqual(A,B);
}
function verifyPassword(password, stored){
  try{
    const [scheme,saltHex,hashHex]=String(stored||'').split('$');
    if(scheme!=='scrypt'||!saltHex||!hashHex)return false;
    const derived=crypto.scryptSync(password,Buffer.from(saltHex,'hex'),Buffer.from(hashHex,'hex').length,{N:16384,r:8,p:1,maxmem:32*1024*1024});
    return timingSafeHex(derived.toString('hex'),hashHex);
  }catch{return false}
}
function makeHash(password){
  const salt=crypto.randomBytes(16); const hash=crypto.scryptSync(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
if(process.argv[2]==='--hash'){
  const p=process.argv.slice(3).join(' '); if(!p){console.error('Usage: node server.js --hash "password"');process.exit(1)}
  console.log(makeHash(p)); process.exit(0);
}

function json(res,status,obj,extra={}){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...securityHeaders(),...extra});
  res.end(JSON.stringify(obj));
}
function securityHeaders(){return {'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};}
function parseCookies(req){const out={};(req.headers.cookie||'').split(';').forEach(x=>{const i=x.indexOf('=');if(i>0)out[x.slice(0,i).trim()]=decodeURIComponent(x.slice(i+1).trim())});return out;}
function session(req){const sid=parseCookies(req).vsl_admin;if(!sid)return null;const s=sessions.get(sid);if(!s||s.expires<Date.now()){sessions.delete(sid);return null}s.expires=Date.now()+SESSION_TTL;return {sid,...s};}
function requireAdmin(req,res){const s=session(req);if(!s){json(res,401,{error:'Unauthorized'});return null}return s;}
function csrf(req,res,s){const token=req.headers['x-csrf-token'];if(!token||token!==s.csrf){json(res,403,{error:'CSRF validation failed'});return false}return true;}
function readBody(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(Buffer.byteLength(b)>MAX_BODY){reject(new Error('Request too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function sendFile(res,file){const ext=path.extname(file).toLowerCase();const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};res.writeHead(200,{...securityHeaders(),'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-store':'public, max-age=86400'});fs.createReadStream(file).pipe(res);}

setInterval(()=>{for(const [id,s] of sessions)if(s.expires<Date.now())sessions.delete(id)},15*60*1000).unref();

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);const p=u.pathname;
    if(p==='/health'&&req.method==='GET'){await pool.query('SELECT 1');return json(res,200,{ok:true,database:true});}
    if(p==='/api/login'&&req.method==='POST'){
      const body=await readBody(req);
      if(typeof body.username!=='string'||body.username!=='admin'||typeof body.password!=='string'||!verifyPassword(body.password,PASSWORD_HASH))return json(res,401,{error:'Invalid credentials'});
      const sid=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');sessions.set(sid,{csrf,expires:Date.now()+SESSION_TTL});
      const forwarded=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();const secure=isProd||forwarded==='https'||!!req.socket.encrypted;
      const cookie=`vsl_admin=${sid}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL/1000}${secure?'; Secure':''}`;
      return json(res,200,{ok:true,csrf},{'Set-Cookie':cookie});
    }
    if(p==='/api/logout'&&req.method==='POST'){
      const c=parseCookies(req);if(c.vsl_admin)sessions.delete(c.vsl_admin);return json(res,200,{ok:true},{'Set-Cookie':'vsl_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});
    }
    if(p==='/api/public-data'&&req.method==='GET')return json(res,200,await loadData());
    if(p==='/api/admin/session'&&req.method==='GET'){const s=session(req);return json(res,200,{authenticated:!!s,csrf:s?.csrf||null});}
    if(p==='/api/admin/data'&&req.method==='GET'){const s=requireAdmin(req,res);if(!s)return;return json(res,200,{data:await loadData(),csrf:s.csrf});}
    if(p==='/api/admin/data'&&req.method==='PUT'){
      const s=requireAdmin(req,res);if(!s||!csrf(req,res,s))return;
      const body=await readBody(req);if(!body||typeof body!=='object')return json(res,400,{error:'Invalid data'});
      const saved=await saveData(body);return json(res,200,{ok:true,data:saved});
    }
    let file=path.join(ROOT,p==='/'?'index.html':p.slice(1));
    if(!fs.existsSync(file)&&p.startsWith('/assets/'))file=path.join(ROOT,p.slice('/assets/'.length));
    if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'index.html');
    return sendFile(res,file);
  }catch(e){console.error(e);return json(res,500,{error:'Server error'});}
});

(async()=>{await initDb();server.listen(PORT,'0.0.0.0',()=>console.log(`Varanasi Sports Live listening on ${PORT}`));})().catch(e=>{console.error('Startup failed:',e);process.exit(1)});
