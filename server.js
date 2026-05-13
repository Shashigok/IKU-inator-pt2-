const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const request = require('request');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

// ─── Header stripping helper ───────────────────────────────────────────────
const BLOCKED_HEADERS = [
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
];

function stripBlockingHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    if (!BLOCKED_HEADERS.includes(k.toLowerCase())) {
      out[k] = v;
    }
  }
  return out;
}

// ─── URL rewriting helper ──────────────────────────────────────────────────
// Rewrites absolute URLs in HTML/CSS so they route back through the proxy.
function rewriteUrls(body, targetOrigin) {
  // Rewrite absolute URLs (href, src, action, url(...))
  return body
    // href="https://..." and src="https://..."
    .replace(/(href|src|action)=(["'])(https?:\/\/[^"']+)(["'])/gi, (_, attr, q1, url, q2) => {
      const encoded = encodeURIComponent(url);
      return `${attr}=${q1}/proxy?url=${encoded}${q2}`;
    })
    // url('https://...') in CSS
    .replace(/url\((["']?)(https?:\/\/[^)"']+)(["']?)\)/gi, (_, q1, url, q2) => {
      const encoded = encodeURIComponent(url);
      return `url(${q1}/proxy?url=${encoded}${q2})`;
    })
    // Absolute paths like href="/path" → rewrite to proxy with base origin
    .replace(/(href|src|action)=(["'])(\/[^/"'][^"']*)(["'])/gi, (_, attr, q1, urlPath, q2) => {
      const full = targetOrigin + urlPath;
      const encoded = encodeURIComponent(full);
      return `${attr}=${q1}/proxy?url=${encoded}${q2}`;
    });
}

// ─── Main proxy endpoint ───────────────────────────────────────────────────
app.get('/proxy', (req, res) => {
  let targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Missing ?url= parameter');
  }

  // Normalise URL
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  let targetOrigin;
  try {
    const u = new URL(targetUrl);
    targetOrigin = u.origin;
  } catch {
    return res.status(400).send('Invalid URL');
  }

  const options = {
    url: targetUrl,
    headers: {
      // Spoof a normal browser request
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity', // avoid compressed responses for rewriting
      Referer: targetOrigin,
    },
    followRedirect: true,
    encoding: null, // raw buffer
    timeout: 15000,
  };

  request(options, (err, response, body) => {
    if (err) {
      console.error('Proxy fetch error:', err.message);
      return res.status(502).send(`Proxy error: ${err.message}`);
    }

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    const strippedHeaders = stripBlockingHeaders(response.headers);

    // Always allow framing from our own origin
    strippedHeaders['x-frame-options'] = 'ALLOWALL';
    strippedHeaders['access-control-allow-origin'] = '*';

    // Remove transfer-encoding to avoid conflicts
    delete strippedHeaders['transfer-encoding'];
    delete strippedHeaders['content-encoding'];

    res.status(response.statusCode);

    // For HTML: rewrite URLs so linked resources also go through proxy
    if (contentType.includes('text/html')) {
      let html = body.toString('utf-8');
      html = rewriteUrls(html, targetOrigin);

      // Inject a small base-tag and script to intercept navigation
      const injection = `
<base href="${targetOrigin}/">
<script>
  // Intercept link clicks and form submissions to keep everything in proxy
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a');
    if (!a || !a.href) return;
    const href = a.href;
    if (href.startsWith('http') && !href.includes(location.host)) {
      e.preventDefault();
      location.href = '/proxy?url=' + encodeURIComponent(href);
    }
  }, true);
</script>`;

      html = html.replace(/<head([^>]*)>/i, `<head$1>${injection}`);

      strippedHeaders['content-type'] = 'text/html; charset=utf-8';
      delete strippedHeaders['content-length'];

      res.set(strippedHeaders);
      return res.send(html);
    }

    // For CSS: rewrite urls
    if (contentType.includes('text/css')) {
      let css = body.toString('utf-8');
      css = rewriteUrls(css, targetOrigin);
      strippedHeaders['content-type'] = 'text/css; charset=utf-8';
      delete strippedHeaders['content-length'];
      res.set(strippedHeaders);
      return res.send(css);
    }

    // Everything else (images, JS, fonts, etc.) — pass through as-is
    res.set(strippedHeaders);
    res.send(body);
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running at http://localhost:${PORT}`);
  console.log(`   Open your browser and go to http://localhost:${PORT}\n`);
});
