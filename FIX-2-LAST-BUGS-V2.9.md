# DINI ANIF V2.9 — Editor Open + Safari Layer Cleanup

Scope intentionally frozen to the remaining interaction/Safari issues.

## Editor
- Fixed event priority in Dashboard Edit and Fetch→Edit runtime.
- `Buka Undangan` controls are now allowed to reach the template's native handler before media hit-testing.
- Supports `#openInvitation`, `#tombolbuka`, `.tombolbuka`, data opener hooks, and a button/link whose visible text is `Buka Undangan`.
- Gallery/media remains editor-selectable and native lightbox/zoom is suppressed when the click is on gallery media.
- Fetch Preview is unchanged.

## Public / iPhone Safari layer audit
The public page had two retired full-screen fixed layers that remained composited after they were visually gone:
- `.preloader` — fixed, inset:0, z-index:10000; previously only opacity 0.
- `.opening` — fixed, inset:0, z-index:9000; previously only visibility/opacity hidden after opening.

V2.9 removes both from layout after their transitions:
- preloader becomes `hidden` after fade.
- opening becomes `hidden` / `display:none` after opening transition.
- opened body is restored to normal root scrolling.

Other fixed UI is intentional: music button, lightbox (display:none unless opened), toast.
