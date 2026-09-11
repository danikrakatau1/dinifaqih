# Dini Anif — FIX 50 Regression V2.4.2

Scope: bug/regression aktif setelah PRO150. Project Dini Anif standalone.

## Template Library 1–8
1. Flicker/double render: fixed with render signature guard.
2. Preview/thumbnail blank fallback: stable preview shell + thumbnail_url support + iframe fallback.
3. Active badge state: reads Supabase only.
4. Active button state: stable and no duplicate local fallback mutation.
5. Card preview size: compacted and constrained.
6. Duplicate state source: removed local fake-active normalization.
7. Single source of truth: Supabase templates table.
8. Loading state: explicit skeleton until preview ready; iframe animation frozen after load.

## Dashboard Edit cover 9–16
9. Buka Undangan missing: cover action guard + action-first event routing.
10. Couple names disappearing: visible cover text protected before open.
11. Other cover text disappearing: visible text/wrapper protection.
12. Editor stuck at cover: original action allowed to execute; unlock parity retained.
13. Open action not bound: robust selector + text fallback for Buka Undangan/Open Invitation.
14. Hydration mismatch: second-pass MutationObserver stabilization.
15. z-index/visibility/display/opacity regression: editor-only guard restores initial visible state.
16. Editor overlay conflict: action controls bypass selection/drag interception.

## Golden cover parity 17–26
17. Dashboard Edit cover follows source/native state.
18. Fetch source/generate engine itself is not rewritten.
19. Text/button hydration stabilized in Editor runtime.
20. Buka Undangan remains clickable.
21. Couple names remain visible before open.
22. Guest/invite text remains visible before open.
23. Logo/ornament DOM is not replaced by the guard.
24. Background/decor remains native; no forced rebuild.
25. Native open animation is released on click (guard removed before source handler proceeds).
26. Fix is isolated to Editor parity/runtime and Template Library.

## Fetch Editor parity 27–36
27. Fetch Editor uses the same fixed /dashboard-admin-edit runtime.
28. Cover text/button protected in Fetch -> Preview -> Editor flow.
29. Stuck cover action interception fixed.
30. Shared runtime race handled once at Editor layer.
31. Initial native cover remains golden reference.
32. Both Dashboard Edit and Fetch Editor receive the fix.
33. Fetch/Analyze/Generate source pipeline not modified by this patch.
34. display/visibility/opacity/class/style mutations monitored until user opens cover.
35. PRO150 click/drag layer bypasses interactive controls.
36. Opening releases guard and restores native styles before continuing.

## Flash/disappear race 37–50
37. Button flashing then disappearing: MutationObserver restores it before open.
38. Text flashing then disappearing: initial visible text/wrappers guarded.
39. Second-pass DOM mutation: observed and stabilized.
40. Late class/style/hidden/aria-hidden changes: monitored.
41. PRO150 rescan no longer hijacks action controls.
42. Render -> editor bridge -> responsive/overlay race: protected through timed stabilization windows.
43. First-paint-only fix avoided; stabilization runs at 40/120/260/600/1200/2400/5000ms.
44. Hidden/display/opacity/visibility cases restored from first visible computed state.
45. Cover cannot be considered opened by Editor guard; only real action click releases it.
46. Duplicate open initialization is avoided by __diniCoverBound.
47. Cover remains stable before user action.
48. Guard actively spans beyond 5 seconds; auto-fallback only after 6.5s if no usable cover.
49. Same runtime behavior applies across repeated iframe loads.
50. Both entry paths share one action-safe Editor implementation.

## Regression checks
- JS syntax: PASS (20 JS files + Template inline JS)
- Action-first routing assertion: PASS
- Cover MutationObserver guard: PASS
- Cover 5s stabilization schedule: PASS
- Native style release on open: PASS
- PRO action bypass: PASS
- Template render de-duplication: PASS
- Template single-source Supabase: PASS
- Auth sync de-duplication: PASS
- Template preview freeze/loading state: PASS
- UndanganKuuu references in runtime/package: 0

Note: source/static regression is green. Final visual timing still needs the normal post-deploy browser smoke test because browser/source-site runtimes cannot be fully executed in the build container.
