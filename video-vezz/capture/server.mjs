import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.json':'application/json'};
export function startServer(port = 8096) {
  const server = http.createServer(async (req,res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      // The production environment file is NEVER read or served.
      if (name === '/js/env.js') {
        res.writeHead(200, {'Content-Type':'application/javascript', 'Cache-Control':'no-store'});
        return res.end('export const VEZZ_ENV = {supabaseUrl:"",supabaseAnonKey:""};');
      }
      if (!/^\/(index\.html|js\/|css\/|assets\/)/.test(name)) {res.writeHead(403); return res.end();}
      const target = path.resolve(root, '.'+name);
      if (!target.startsWith(root+path.sep)) {res.writeHead(403); return res.end();}
      const bytes = await readFile(target);
      res.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store'});
      res.end(bytes);
    } catch {res.writeHead(404); res.end();}
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => {console.log(`VEZZ DEMO http://127.0.0.1:${port} — local adapter only`);resolve(server);}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await startServer();
