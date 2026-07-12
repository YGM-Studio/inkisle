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

## Theme

InkIsle ships with built-in themes. The default is `personal`. Use
`business-blog` for a more commercial blog or resource-center presentation:

```js
export default {
  theme: {
    name: "business-blog",
    defaultMode: "light",
    allowUserToggle: false
  }
};
```

`name` selects the visual theme. `defaultMode`, `allowUserToggle`, and
`storageKey` control light/dark/system color mode behavior.

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

URL migration redirects can also be configured in `inkisle.config.mjs`. Build
output includes a `_redirects` file that Cloudflare Pages can use for 301s.
`status` defaults to `301`:

```js
export default {
  redirects: [
    {
      from: "/前端/NPM小技巧/",
      to: "/posts/2020/NPM小技巧/",
      status: 301
    },
    {
      from: "/posts/NPM小技巧/",
      to: "/posts/2020/NPM小技巧/"
    }
  ]
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

## Comments and reactions

Interactions are disabled by default and do not require InkIsle to run in SSR
mode. Waline is the recommended provider for general readers. Deploy a Waline
server and configure its public URL:

```js
export default {
  interactions: {
    provider: "waline",
    localeScope: "separate",
    waline: {
      serverURL: "https://comments.example.com",
      reaction: true
    }
  }
};
```

Use Giscus when readers can sign in with GitHub and repository-backed
discussions are preferred:

```js
export default {
  interactions: {
    provider: "giscus",
    giscus: {
      repo: "owner/repository",
      repoId: "R_...",
      category: "Announcements",
      categoryId: "DIC_..."
    }
  }
};
```

Posts created by `inkisle new post` receive an `interactionId`. Keep that ID
stable after publication even when the file, title, or URL changes. Existing
posts derive an ID from their original content path. A post can override the
defaults in frontmatter:

```yaml
interactionId: permanent-post-id
comments: true
reactions: false
```

Set `comments: false` to remove the complete interaction section. Set
`localeScope: "shared"` to share one discussion between translations that use
the same `interactionId`; the default `"separate"` mode keeps languages apart.

See `docs/interactions.md` in the InkIsle package for the architecture,
resource overrides, and migration rules.
