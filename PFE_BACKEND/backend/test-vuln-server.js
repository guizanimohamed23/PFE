const http = require('http');

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, 'http://127.0.0.1:8123');
  const path = requestUrl.pathname;
  const cat = requestUrl.searchParams.get('cat') || '';
  const q = requestUrl.searchParams.get('q') || '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Powered-By', 'MiniVulnLab');

  if (path === '/robots.txt') {
    res.end('User-agent: *\nDisallow: /admin\n');
    return;
  }

  if (path === '/products.php') {
    if (/['"`]|union select|sleep\(|or 1=1/i.test(cat)) {
      res.statusCode = 500;
      res.end(`<html><body><h1>Database Error</h1><pre>SQL syntax error near ${JSON.stringify(cat)}</pre><p>query failed: SELECT * FROM products WHERE cat='${cat}'</p></body></html>`);
      return;
    }

    res.end(`<html><body><h1>Products</h1><p>Category: ${cat}</p><p>Lookup completed successfully.</p></body></html>`);
    return;
  }

  if (path === '/search') {
    if (/<script/i.test(q)) {
      res.end(`<html><body><h1>Search Results</h1><div id="reflected">${q}</div></body></html>`);
      return;
    }

    res.end(`<html><body><h1>Search Results</h1><p>${q}</p></body></html>`);
    return;
  }

  if (path === '/admin') {
    res.statusCode = 403;
    res.end('<html><body><h1>Forbidden</h1></body></html>');
    return;
  }

  res.statusCode = 404;
  res.end('<html><body><h1>Not Found</h1></body></html>');
});

server.listen(8123, '127.0.0.1', () => {
  console.log('MiniVulnLab listening on http://127.0.0.1:8123');
});
