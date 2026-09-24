# Dung / Lab — Portfolio design system

## Intent
A work-first portfolio for a Unity developer / playable ads engineer. Visitors should discover live work in one scroll, learn the engineer's specialties, and reach a real contact address. The aquarium is the visual signature, not a replacement for navigation.

## Information architecture / user journey
1. Hero: who, what, primary Explore Work action; live Aquarium entry point.
2. Work: four real, locally published demos; filter by experiments / games / playable ads. All project actions resolve to the existing GitHub Pages output.
3. About: short first-person introduction grounded in the public GitHub profile.
4. Expertise: Game Development, Playable Ads, Creative Systems with technologies.
5. Contact: email + GitHub + LinkedIn; no fake form or unverifiable counters.

## Visual language
- Deep marine background `#07151e`, lime highlight `#d9ef68`, muted teal surfaces, dense editorial headings. Alternate light palette via CSS variables on `html[data-theme=light]`.
- Large typography, tight tracking, numbered section labels, monospace metadata, crisp outlines, expressive gradients and an actual generated Aquarium SVG.
- System fonts, no tracking scripts, no remote font dependencies. Static HTML/CSS/JS; the existing game build and Pages workflow remain intact.

## Interaction and accessibility
- Theme button persists the choice in localStorage, but works if storage is blocked. Native links/buttons, visible keyboard focus, skip link, descriptive alt text and accessible mobile menu state.
- Project filters reflect state using `aria-pressed` and hide nonmatching projects. `prefers-reduced-motion` disables motion. Responsive layout at 1100 / 760 / 440px.
- No claim of WCAG audit: test keyboard, contrast and screen readers before announcing compliance.

## Content editing
Edit copy and project links in `docs/index.html`, tokens/components in `docs/assets/portfolio.css`, interactions in `docs/assets/portfolio.js`. The email is `dungvd01@horusvn.com`; confirm it and the availability wording before public release. Update project count if adding a card. Existing demos are untouched. The aquarium SVG is rebuilt by the existing Pages pipeline. `npm run build:all` writes application `dist/` files; use the Pages workflow to copy them into `docs/apps/`.

## Delivery pipeline
`npm run build:all` builds existing playable artifacts and installs locked Phaser dependencies for the restaurant app; `npm run test:ci` checks demos and the portfolio's published paths. `.github/workflows/pages.yml` rebuilds Aquarium and all demos, runs the checks, then deploys `docs/` to GitHub Pages on pushes to `main` or manual dispatch. In the repository's Settings → Pages, configure source **GitHub Actions**. No deploy without GitHub permissions and pushing to remote.
