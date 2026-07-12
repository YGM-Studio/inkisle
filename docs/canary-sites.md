# Canary Sites

InkIsle maintains two external canary sites for published npm releases. They
behave like independent content-only users: each installs an exact `inkisle`
version from npm, builds outside the source workspace, and deploys through its
own GitHub Pages workflow.

The official InkIsle site validates the current source tree. The canaries
validate the package that users can actually install. Keeping those paths
separate catches release, packaging, base-path, and provider integration
regressions that a workspace build can miss.

## Environments

| Environment | Source | Live site | Interaction provider | External data |
| --- | --- | --- | --- | --- |
| Giscus npm canary | [`YGM-Studio/inkisle-canary`](https://github.com/YGM-Studio/inkisle-canary) | [`/inkisle-canary/`](https://ygm-studio.github.io/inkisle-canary/) | Giscus | `YGM-Studio/inkisle` Discussions, `InkIsle Blog` category |
| Waline npm canary | [`YGM-Studio/inkisle-waline-canary`](https://github.com/YGM-Studio/inkisle-waline-canary) | [`/inkisle-waline-canary/`](https://ygm-studio.github.io/inkisle-waline-canary/) | Waline | Neon database through the Vercel lab |

The Waline backend is maintained separately:

- Source: [`sky-admin/inkisle-waline-lab`](https://github.com/sky-admin/inkisle-waline-lab)
- Service URL: [`https://inkisle-waline-lab.vercel.app`](https://inkisle-waline-lab.vercel.app)
- Runtime: Vercel Functions with a Neon Postgres database

The Waline deployment is a test fixture, not a production comment service. Do
not use it as the data store for a real blog or promise long-term retention for
comments submitted there.

## What They Validate

Both canaries verify that:

- the exact version declared in `package.json` is installed from npm;
- a content-only project passes `inkisle check`, build, and link checks;
- static assets, navigation, feeds, and search work below a GitHub Pages base
  path;
- Chinese and English versions can share one stable interaction key;
- the `personal` theme loads the configured provider in light and dark modes;
- CI and GitHub Pages can deploy without access to the InkIsle source checkout.

The Giscus canary additionally validates the iframe, GitHub login, Discussion
lookup, replies, and Discussion reactions. The Waline canary validates the
independent browser client, Vercel backend, Neon schema, comment form, and
Waline reactions.

## Stable Test Data

The Giscus canary uses `interactionId: "npm-canary"`. Its Discussion is part of
the long-lived acceptance data in the main InkIsle repository.

The Waline canary uses `interactionId: "waline-canary"`. Its Chinese and
English pages should resolve to the same Neon records.

Treat these identifiers as database primary keys. Renaming one creates a new
empty thread and makes the existing acceptance history appear to be missing.
Changing a public route or Pages base path should not require changing either
identifier.

## Release Update Runbook

Update both canary repositories after publishing a new InkIsle version:

```bash
npm install --save-exact inkisle@<version>
npm ci
npm run ci
```

Commit `package.json` and `package-lock.json`, push `main`, and wait for both
the `CI` and `Pages` workflows to pass. Then perform these live checks:

1. Open the Chinese and English post routes on both sites.
2. Confirm assets and internal links stay below the repository base path.
3. Confirm the Giscus canary opens the existing `npm-canary` Discussion rather
   than creating a new one.
4. Confirm the Waline canary renders reactions, the comment form, and the
   existing `waline-canary` records in both languages.
5. Switch light and dark modes and confirm the provider remains readable.

Do not submit automated test comments from CI. Provider state is external and
should remain understandable to a human reviewing the acceptance sites.

## Operations And Secrets

Giscus repository and category IDs are public identifiers. Vercel and Neon
credentials are secrets and must remain in the provider dashboards; they must
not be committed to a canary repository.

Common failure signals:

- A new empty Giscus thread usually means `interactionId`, repository, or
  category configuration changed.
- A missing Giscus iframe usually means the Giscus App lost repository access
  or Discussions were disabled.
- A Waline form that fails to load usually means the Vercel service is down or
  its `serverURL` changed.
- Waline database errors usually mean the Neon environment variables are not
  attached to the current deployment or the official Waline schema is absent.
- A new Pages repository may need Pages enabled with GitHub Actions as its
  build source before the first workflow can deploy.

Removing a frontend canary does not remove provider data. Giscus Discussions,
the Waline Vercel project, and the Neon database have separate lifecycles and
must be reviewed explicitly before deletion.
