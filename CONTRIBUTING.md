# Contributing to InkIsle

InkIsle is an early alpha project. Contributions are welcome, but the public API, theme boundary, and CLI behavior may still change while the project matures.

## Development Setup

```bash
npm install
npm run dev
```

The root npm scripts run against `starters/default` through npm workspaces.

## Quality Checks

Before opening a pull request, run:

```bash
npm run ci
```

This runs Astro diagnostics, builds the default starter, checks generated internal links, and fails on high-severity npm audit findings.

## Pull Request Guidelines

- Keep changes focused on one concern.
- Update README or docs when behavior, commands, config, or generated output changes.
- Add or update checks when changing CLI behavior, content routing, generated files, or theme output.
- Do not commit generated `dist/`, `.astro/`, `.inkisle-build/`, `node_modules/`, or local environment files.

## Release Process

Releases are tag-driven and published by GitHub Actions through npm Trusted Publishing.

```bash
npm run release
```

The release script updates package versions, runs the build, performs an npm dry run, commits the release, creates a `vX.Y.Z` tag, and pushes the branch and tag.
