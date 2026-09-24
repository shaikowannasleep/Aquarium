AQUARIUM / DUNG LAB — PORTFOLIO REDESIGN — APPLY GUIDE
Version: v1.0 / 2026-09-24
Base repository: https://github.com/shaikowannasleep/Aquarium
Base commit: 30a4615b93ca9a78ff6b704be103a1482637bacf (main at time of development).

CONTEXT
Rebuild the docs/ landing page into a portfolio for Dung with responsive marine theme, light/dark toggle, four published work cards, project filters, About, skills, and contact. Keep all existing app sources and demos. Add a smoke test and extend the existing GitHub Pages workflow to install restaurant dependencies and validate builds. No changes to app gameplay.

FILES IN ARCHIVE (relative to repository root)
.github/workflows/pages.yml
docs/index.html
docs/assets/favicon.svg
docs/assets/portfolio.css
docs/assets/portfolio.js
docs/PORTFOLIO-DESIGN.md
package.json
tools/check-portfolio.js
README-APPLY.txt (this file)

APPLY ON WINDOWS / POWERSHELL (run from YOUR Aquarium repository root)
1. Check base & working tree: git rev-parse HEAD; git status --short
2. Back up your local files before overwrite:
   $backup = "../Aquarium-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
   New-Item -ItemType Directory -Force $backup | Out-Null
   foreach ($f in @('.github/workflows/pages.yml','docs/index.html','package.json','README-APPLY.txt')) { $dst = Join-Path $backup $f; New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null; Copy-Item $f $dst }
3. Unzip AT the repository root, not into a nested Aquarium directory:
   Expand-Archive -Path "../Aquarium-portfolio-redesign-update-v1.0-20260924.zip" -DestinationPath . -Force
4. Build/test/status:
   npm run test:ci
   npm run build:all
   git status --short
   git diff --check
   npm run serve
   # open http://localhost:8090 ; stop with Ctrl+C
5. After visual and content review, stage ONLY intentional changes:
   git add .github/workflows/pages.yml docs/index.html docs/assets/favicon.svg docs/assets/portfolio.css docs/assets/portfolio.js docs/PORTFOLIO-DESIGN.md package.json tools/check-portfolio.js README-APPLY.txt
   git commit -m "Redesign Dung Lab portfolio landing page"
   git push origin main

CHECKS BEFORE PUBLISH
Check at 375 / 768 / 1440 px, both themes, menu, keyboard focus/skip link, all 4 project links, filters, contact email and reduced-motion preference. Confirm your public contact email, copy and project details. GitHub Settings → Pages → Source must be GitHub Actions; check Actions → Build portfolio pages after pushing. Published URL expected: https://shaikowannasleep.github.io/Aquarium/ (subject to Pages settings).

ROLLBACK
Before commit: restore copied backup files and delete newly added files. After commit: use git revert <new-commit> and push the revert (do not force-push shared history). The backup folder created above contains only previously existing files.

DO NOT
Do not delete docs/apps/, overwrite game source files, commit node_modules/, blindly commit generated dist/ files, force-push or publish before confirming content. This patch does not push/deploy automatically. npm run build:all builds app dist outputs; GitHub Actions copies builds into docs/apps/.
