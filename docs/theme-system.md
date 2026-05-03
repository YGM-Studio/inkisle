# InkIsle Theme System

InkIsle uses starters and themes for different jobs.

- `starter` defines the project skeleton created by `inkisle init`.
- `renderer` owns content loading, routes, feeds, search indexes, sitemap, and static output.
- `theme` owns visual presentation and page layout for the same content model.

This means a business-style blog should usually be a theme, not a separate starter. A new starter is only needed when the generated user project needs a different file structure, default content set, or dependency shape.

## V0 Scope

V0 supports built-in themes only.

Goals:

- Keep renderer logic shared across all themes.
- Let users select a built-in theme with site config.
- Keep the default personal blog behavior stable.
- Add a business blog theme without duplicating routes, content loading, feeds, search, or deployment files.

Non-goals:

- npm package themes.
- Local theme directories.
- Per-component user overrides.
- Theme plugin APIs.
- Arbitrary route ownership by themes.

Those can be added after the built-in theme boundary is proven.

## Configuration

The `theme` config combines two related but separate concerns:

- `name`: visual site theme.
- `defaultMode`, `allowUserToggle`, `storageKey`: light/dark/system color mode behavior.

Example:

```js
export default {
  theme: {
    name: "business-blog",
    defaultMode: "light",
    allowUserToggle: false
  }
};
```

Default config:

```ts
theme: {
  name: "personal",
  defaultMode: "system",
  allowUserToggle: true,
  storageKey: "inkisle-theme"
}
```

Unknown theme names should fall back to `personal` so existing sites continue to build.

## Directory Shape

Built-in themes live inside the internal Astro renderer:

```text
starters/default/src/
  pages/
  lib/
  config.ts
  components/
    RedirectPage.astro
  themes/
    types.ts
    registry.ts
    personal/
      components/
      layouts/
      styles.css
      theme.ts
    business-blog/
      components/
      layouts/
      styles.css
      theme.ts
```

`pages/` remains the owner of URL generation. Page routes fetch content and then render the active theme component.

## Theme Contract

The V0 contract is intentionally page-level:

```ts
export type InkIsleTheme = {
  name: string;
  label: string;
  components: {
    HomePage: AstroComponentFactory;
    PostArchivePage: AstroComponentFactory;
    PostLayout: AstroComponentFactory;
    MarkdownPage: AstroComponentFactory;
    TaxonomyPage: AstroComponentFactory;
    SearchPage: AstroComponentFactory;
    NotFoundPage: AstroComponentFactory;
  };
};
```

Themes can have their own internal components, layout, and CSS, but renderer features stay outside the theme boundary.

## Rendering Flow

Routes resolve the active theme from config and render a component from the registry:

```astro
---
import { siteConfig } from "../config";
import { getActiveTheme } from "../themes/registry";

const theme = await getActiveTheme(siteConfig.theme.name);
const HomePage = theme.components.HomePage;
---

<HomePage locale={siteConfig.defaultLocale} />
```

This keeps the route map stable and avoids copying route files per theme.

## CSS Strategy

Each built-in theme owns a complete theme stylesheet:

```text
themes/personal/styles.css
themes/business-blog/styles.css
```

Theme `BaseLayout` components import their own stylesheet. Shared CSS should only be introduced when multiple themes actually need the same reset, prose, or accessibility primitive. Visual tokens, page layout, cards, navigation, and footer styling belong to each theme.

Astro can emit CSS for more than one imported built-in theme in the same build output, so theme CSS must be scoped by the layout attribute:

```html
<html data-inkisle-theme="business-blog">
```

Every theme stylesheet should target that attribute, for example:

```css
html[data-inkisle-theme="business-blog"] .site-header {
  /* theme-specific header styles */
}
```

This prevents built-in themes from overriding each other when their CSS assets are both linked.

## Built-In Themes

### `personal`

The existing default InkIsle theme. It prioritizes a personal publishing voice, long-form reading, tags, categories, and a compact site identity.

### `business-blog`

A business content theme for company blogs, resource centers, and product-led publishing.

Expected differences from `personal`:

- More explicit brand header and primary navigation.
- Homepage with positioning, featured/latest content areas, category lanes, and a CTA band.
- Resource-center style post cards.
- Article layout with stronger summary, metadata, tags, and conversion-oriented footer CTA.
- Footer with company/product/resource links.
- More restrained typography and a professional visual system.

## Future Extension

After built-in themes are stable, the config can grow toward:

```js
export default {
  theme: {
    source: "builtin",
    name: "business-blog"
  }
};
```

Possible future sources:

- `builtin`: shipped with InkIsle.
- `local`: a theme directory inside the user project.
- `package`: an npm package theme.

External themes should wait until the page-level contract, content props, and compatibility rules are stable.
