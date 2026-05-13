# iframe Proxy Server

A Node.js proxy that strips `X-Frame-Options`, `Content-Security-Policy`, and other iframe-blocking headers so any URL can be embedded in an iframe.

## Features

- Strips all iframe-blocking headers
- Rewrites asset URLs (images, CSS, JS) to also go through the proxy
- Intercepts link clicks to keep navigation inside the proxy
- Inline viewer mode (embed in same page) or about:blank tab mode
- Spoofs browser User-Agent for better compatibility
- Follows redirects automatically

## Setup

### 1. Install Node.js
Download from https://nodejs.org (v18 or newer recommended)

### 2. Install dependencies
```bash
cd proxy-server
npm install
```

### 3. Start the server
```bash
npm start
```

The server will start on **http://localhost:3000**

### 4. Open your browser
Go to **http://localhost:3000** and enter any URL to load it through the proxy.

---

## Usage

### Via the web UI
- Enter a URL in the input box
- Choose **Inline** (loads inside the same tab) or **about:blank tab**
- Click **Go**

### Via direct URL
You can also use the proxy endpoint directly:
```
http://localhost:3000/proxy?url=https://example.com
```

---

## Dev mode (auto-restart on file changes)
```bash
npm run dev
```

---

## Notes

- Some sites (e.g. banking, Google) use JavaScript-based frame-busting in addition to headers. The proxy strips the headers, but JS-based checks may still redirect out of the frame.
- HTTPS sites are fully supported.
- This is intended for local/personal use only.
