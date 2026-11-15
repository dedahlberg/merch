const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function same(a,b) {
  const left = crypto.createHash('sha256').update(a).digest();
  const right = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(left,right);
}
module.exports = function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  const secret=process.env.DASHBOARD_PASSWORD;
  if (!secret) {
    res.statusCode=503;
    return res.end('Dashboard access is not configured. Set DASHBOARD_PASSWORD in Vercel Production Environment Variables and redeploy.');
  }
  const auth=req.headers.authorization||'';
  let valid=false;
  if(auth.startsWith('Basic ')){
    try{
      const decoded=Buffer.from(auth.slice(6),'base64').toString('utf8');
      const separator=decoded.indexOf(':');
      valid=separator>=0 && same(decoded.slice(separator+1),secret);
    }catch(_){}
  }
  if(!valid){
    res.setHeader('WWW-Authenticate','Basic realm="MERCH Route Dashboard", charset="UTF-8"');
    res.statusCode=401;
    return res.end('Password required');
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');res.statusCode=405;return res.end('Method not allowed');}
  try{
    const html=fs.readFileSync(path.join(process.cwd(),'index.html'));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.statusCode=200;
    return res.end(req.method==='HEAD'?undefined:html);
  }catch(e){res.statusCode=500;return res.end('Dashboard temporarily unavailable');}
};
