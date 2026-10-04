# HTTP cache security backport

The npm registry still reports GHSA-ch52-4w7c-c8xp for `http-cache-semantics`
4.2.0, including Astro's transitive dependency. There is no published patched
version at the time of this change. Package names and versions stay unchanged.

`http-cache-semantics-4.2.0.cjs` is the exact runtime source from
[upstream PR #60](https://github.com/kornelski/http-cache-semantics/pull/60),
commit `11fb104275349bbd84bf21eafd40b18220c29c46`. It incorporates the
contributions from hellonewday, itsalexfer and Sergey360, including the prior
inherited-header fix on upstream main. The original BSD-2-Clause license is
retained in `http-cache-semantics.LICENSE`.

The fix separates response reuse restrictions from ordinary expiry. It prevents
`max-stale`, `stale-if-error` and `stale-while-revalidate` from reviving restricted
responses, validates the incoming request before error fallback, and prevents
forbidden stale extensions from increasing retention time. Normal expiration,
private caches, explicit cookie opt-ins and successful 304 validation remain
supported. This fixes the cache policy library; it does not certify arbitrary
consumers that ignore its policy decisions.

Installation and the InkIsle rendering commands apply the backport only to the
exact known 4.2.0 source. An unknown source or dependency version stops the build
and requires review. An atomic file replacement avoids modifying shared package
store hardlinks. Full projects include the same installer and command guards;
content-only projects use the installed InkIsle CLI guard. The renderer uses a
new cache directory so existing assets cannot inherit the old retention window.

In this repository, `npm run test:cache` tests the installed library, including
serialized policies and legitimate caching controls. `npm run audit:dependencies`
runs the registry audit and verifies the source hash of every reported cache
copy before accepting this single backported advisory and its Astro propagation.
Other high/critical advisories, another advisory on these packages, missing code,
and audit failures remain blocking. Raw `npm audit` still reports the original
package version; a clean registry report is not claimed.

When an official patched release is available, verify it against the regression
tests, update the lockfile, then remove this backport, its installer/CLI guards,
the special audit handling and the cache-directory suffix. Retain the regression
tests and restore the direct `npm audit --audit-level=high` gate.
