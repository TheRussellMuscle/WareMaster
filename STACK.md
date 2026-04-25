# Software Stack

Recorded so future contributors (and Claude Code in future sessions) understand the foundation choices.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Shell | **Tauri 2** | Cross-platform (Win/Mac/Linux desktop now; iOS/Android available for v2). 3–5 MB bundles vs Electron's 100+ MB. Built-in updater plugin. MIT/Apache. Rust backend gives unrestricted plaintext filesystem access. |
| Frontend framework | **React 19 + TypeScript** | Largest ecosystem, best Claude Code coverage, easiest long-term maintenance. |
| Build tool | **Vite** | Standard for Tauri; fast HMR. |
| UI components | **shadcn/ui** | Copy-paste components (no dependency lock-in), beautiful defaults, deep theming via CSS variables. |
| Styling | **Tailwind CSS v4** | Pairs with shadcn/ui; theme tokens drive the whole app. |
| State | **Zustand** | Tiny, ergonomic, no boilerplate. |
| Routing | **TanStack Router** | Type-safe, file-based; works offline. |
| Persistence | **Plaintext via Tauri fs plugin** | YAML for data, Markdown for narrative. User-readable, hand-editable, git-friendly. |
| Updates | **tauri-plugin-updater** | Signed releases pulled from GitHub Releases. Free. |
| Distribution | **GitHub Releases + GitHub Actions** | Free CI to build all platforms; free hosting. |
| License | **MIT** | Maximum reuse; standard for open-source TTRPG tools. |

## File storage format

- **YAML** for game data (characters, encounters, party state) — human-readable, supports comments, easy diffs.
- **Markdown + YAML frontmatter** for narrative content (campaign notes, session logs, NPC bios).
- **No SQLite** — explicit user requirement is plaintext folders.

## Platform scope

- **v1**: Windows / Mac / Linux desktop only. Tauri 2's most mature target; fastest path to a working tool.
- **v2+**: Android and iOS via Tauri 2 mobile, once the data model has stabilized through real desktop use. Tauri (vs Electron) keeps that option open with no rewrite.

## Why not the alternatives

- **Flutter** — Dart is less Claude-friendly; mobile filesystem access is more sandboxed (works against the "user-readable folder" goal); theming less flexible than shadcn/Tailwind.
- **Electron** — disqualified: no mobile path.
- **Capacitor / Ionic** — mobile-first; desktop story is awkward.
- **PWA** — file system access too limited for a true plaintext-folder workflow on mobile.
- **Svelte** instead of React — viable, but smaller ecosystem and less Claude depth on Svelte 5 + shadcn-svelte.

## Cost

Every dependency above is free and open-source. The only optional paid item is an Apple Developer account ($99/yr) if iOS distribution is added later — not needed for v1.
