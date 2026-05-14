# I.K.U Inator pt 2

A lightweight browser proxy that lets you view any website inline — no server required.

## How it works

Porky Proxy fetches pages through [allorigins.win](https://api.allorigins.win), a public CORS proxy, and injects the HTML directly into an iframe. This strips X-Frame-Options and CSP headers that would normally block embedding, all without needing a backend server.

## Features

- ✅ No server or backend needed — pure static site
- ✅ Strips X-Frame-Options & CSP headers
- ✅ View sites inline or open in a new tab
- ✅ Rewrites relative asset URLs so pages load correctly
- ✅ Hosted on GitHub Pages

## Usage

1. Visit the site: **https://shashigok.github.io/porkytesting**
2. Enter any URL in the input field
3. Choose a display mode — **Inline** (loads in the page) or **New Tab**
4. Hit **Go ↗**

## Limitations

- Some sites (Google, banking, social media) may still block embedding due to JavaScript frame-busting techniques
- Works best with simple or static sites
- Dependent on [allorigins.win](https://allorigins.win) being available

## Deployment

This is a static site — just push `index.html` to a GitHub Pages branch and it works out of the box. No build step, no dependencies.

## License

MIT
