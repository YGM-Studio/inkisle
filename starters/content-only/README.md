# InkIsle Site

This is a lightweight InkIsle content site.

## Shape

```text
content/             # Markdown posts and pages
public/              # optional static assets
inkisle.config.mjs   # optional site configuration
package.json         # scripts and InkIsle dependency
```

The Astro renderer, theme source, routes, and build integration live inside the `inkisle` package. This project intentionally does not expose `astro.config.mjs` or `src/` by default.

Main-language content is published without a URL prefix by default. Translated content uses a language prefix, for example `/en/posts/my-post/`.

Set `published: false` in Markdown frontmatter to keep a post or page out of
production builds and public indexes until it is ready.

## Commands

```bash
npm install
npm run dev
npm run build
npm run check
npm run check:links
npm run preview
```

Footer ICP filing text is optional. Add it to `inkisle.config.mjs` only when you have a filing number:

```js
export default {
  filing: {
    icp: {
      number: "京ICP备00000000号"
    }
  }
};
```

Optional Baidu analytics and PWA settings also live in `inkisle.config.mjs`.
InkIsle emits real `/404.html`, `/manifest.json`, `/manifest.webmanifest`,
and `/sw.js` files during build. Search engine verification files that must
live at the site root can be placed in `public/`, or generated from config:

```js
export default {
  analytics: {
    baidu: {
      id: "your-baidu-analytics-id"
    }
  },
  verificationFiles: [
    {
      path: "/baidu_verify_example.html",
      content: "verification-code"
    }
  ],
  pwa: {
    enabled: true,
    registerServiceWorker: true,
    name: "My site",
    shortName: "Site"
  }
};
```
