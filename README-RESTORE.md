# GustavoPMaia — clean restored repository

Working website restored from the last good commit (`eeec39c2d5e3`), **with the
AI assistant removed**, plus the design system in its own subfolder.

## What changed
- AI assistant removed: deleted `assistant.js`, `assistant-data.js`, `chat.js`,
  `AI-ASSISTANT-SETUP.md`; removed the two assistant `<script>` tags from
  `index.html`; dropped the assistant from `sw.js` and bumped the cache version
  (`gpm-v16 -> gpm-v17`) so browsers purge the old widget.
- Everything else is the original site, untouched.

## Layout
- **Root** = the live website (GitHub Pages): `index.html`, `style.css`,
  `ui-extra.css`, `script.js`, `search.js`, `sw.js`, `robots.txt`, `favicon.svg`,
  `cv.pdf`, `sections/`, `images/`, `other/`.
- **`design-system/`** = the GPM Astrobiology design system (tokens, components,
  guidelines, UI kit, assets). Isolated from the site.

## Publish (overwrite the broken `main`)
From your local clone:

```bash
git checkout main
git reset --hard eeec39c2d5e3      # back to the clean site
# delete the working tree, unzip this folder's contents in its place, then:
git add -A
git commit -m "Restore site, remove AI assistant, add design-system/"
git push --force-with-lease origin main
```
