# Interactions Plan

## Goal

InkIsle should support article comments and reactions without changing its
static-first rendering model. A content-only site must be able to enable an
interaction provider from `inkisle.config.mjs`; themes only own placement and
visual spacing, while the renderer owns provider behavior.

The first implementation supports:

- Waline as the recommended provider for general readers and Chinese sites.
- Giscus as the zero-maintenance provider for developer and open-source sites.
- Stable article identifiers that survive URL, title, locale-prefix, and
  deployment-base changes.
- Site-wide provider settings with article-level opt-out.
- Separate or shared discussion threads for translated articles.

InkIsle does not provide a hosted comment service, authentication system,
moderation backend, or server-side rendering runtime.

## Decisions

### Keep static output

Provider markup is pre-rendered as part of each article. Provider clients load
in the browser only when the site owner explicitly configures one. Sites with
`provider: "none"` emit no external provider scripts or stylesheets.

### Use a renderer-owned provider boundary

The renderer exposes one `InteractionSection` component to every built-in
theme. It selects the provider and supplies a stable article key. Themes do not
contain Waline or Giscus configuration and do not access provider APIs.

This boundary keeps feature behavior consistent between built-in themes and
allows additional providers to be added without changing article routes.

### Treat provider data as external state

Comments and reactions are not Markdown content and are not included in feeds,
search indexes, posts JSON, or `llms.txt`. Builds remain deterministic and do
not need access to the provider service.

### Require an explicit provider

Interactions are disabled by default. Selecting a provider without its
required connection fields is a build-time configuration error, rather than a
blank or partially working article section.

## Configuration Contract

```js
export default {
  interactions: {
    provider: "waline", // "none" | "waline" | "giscus"
    localeScope: "separate", // "separate" | "shared"
    waline: {
      serverURL: "https://comments.example.com",
      reaction: true
    }
  }
};
```

Waline's `reaction` accepts `true`, `false`, or an array of reaction image
URLs. A one-item array can present a single like-style reaction.

Giscus uses a fixed `specific` mapping so that URL changes do not create new
threads:

```js
export default {
  interactions: {
    provider: "giscus",
    localeScope: "separate",
    giscus: {
      repo: "owner/repository",
      repoId: "R_...",
      category: "Announcements",
      categoryId: "DIC_..."
    }
  }
};
```

Giscus comments and reactions require GitHub authentication. InkIsle enables
reactions on the Discussion's main post unless an article opts out.

## Content Contract

Posts may define:

```yaml
interactionId: quick-start
comments: true
reactions: true
```

- `interactionId` is the permanent provider key. Authors should set it before
  publishing when URLs or file names may change.
- When omitted, InkIsle derives it from the content kind and original file
  path, excluding the locale directory.
- `comments: false` disables the complete interaction section for that post.
- `reactions: false` keeps comments but disables provider reactions.
- `localeScope: "separate"` appends the article locale to the provider key.
- `localeScope: "shared"` uses the same key for translations with the same
  `interactionId` or relative content path.

Changing an established `interactionId` creates a new provider thread. It
should therefore be treated like changing a database primary key.

## Provider Behavior

### Waline

- The browser client connects to the configured external Waline server.
- The stable interaction key is passed as Waline's `path` instead of using
  `window.location.pathname`.
- Dark mode follows InkIsle's `html[data-theme="dark"]` state.
- Client resources use a version-pinned URL and may be overridden for
  self-hosting or a private CDN.
- Initialization failure leaves a localized link that reloads the article.

### Giscus

- The repository, repository ID, category, and category ID are required.
- InkIsle uses `mapping="specific"` and sends the stable interaction key as
  the term.
- The iframe loads lazily and follows InkIsle theme changes through the Giscus
  `postMessage` API.
- Client resources default to `https://giscus.app` and may be served by a
  compatible custom host.

## Security And Privacy

- No provider is enabled by default and no credentials are embedded by
  InkIsle.
- Provider configuration contains public client identifiers only. Server
  secrets must stay in the provider deployment environment.
- Site owners are responsible for provider privacy disclosures, moderation,
  spam controls, rate limits, data retention, and backups.
- Custom provider resource URLs must use HTTPS in production.
- Provider HTML is never mixed into Markdown rendering.

## Delivery Phases

### Phase 1: built-in adapters

- Add the configuration and content contracts above.
- Add renderer-owned Waline and Giscus components.
- Mount the same interaction section in both built-in themes.
- Document setup, article overrides, locale behavior, and migration risks.
- Verify disabled, Waline, Giscus, theme, base-path, and locale builds.

### Phase 2: operational improvements

- Add a provider extension API when the theme/plugin boundary is public.
- Add CLI diagnostics for provider connectivity and common configuration
  mistakes.
- Consider comment counts in article lists without making builds depend on a
  live provider.

### Explicitly deferred

- An InkIsle-hosted comment service.
- Custom authentication, moderation UI, notification delivery, or spam engine.
- SSR solely for comments or reactions.
- Combining comments and reactions from different providers by default.

## Acceptance Criteria

1. Default builds contain no Waline or Giscus resources.
2. A content-only project can enable either provider using only
   `inkisle.config.mjs`.
3. Both built-in themes render the same provider behavior.
4. Provider keys do not depend on the public URL, deployment `base`, article
   title, or frontmatter `slug`.
5. Locale sharing follows `localeScope` deterministically.
6. `comments: false` removes the section and `reactions: false` disables
   reactions while preserving comments.
7. Light and dark themes remain readable, and Giscus receives runtime theme
   changes.
8. Missing required provider fields fail the build with an actionable error.
9. Existing feeds, indexes, PWA output, and static deployment checks continue
   to pass.
