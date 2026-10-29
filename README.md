# Gustavo Pinho Maia · personal website

Live at **https://gustavopmaia98.github.io/GustavoPMaia/** (GitHub Pages, published from `main`).

The page is plain HTML/CSS/JS: `index.html` loads each part from `sections/*.html`, and
three parts are built from data files that update by themselves.

| Part of the site | Comes from | Updated by |
| --- | --- | --- |
| Publications | `data/publications.json` | nightly, from ORCID + Crossref + OpenAlex (journal articles only, preprints excluded) |
| Academic Tree | `data/tree.json` | nightly, new mentors from [Chemistry Tree](https://academictree.org/chemistry/tree.php?pid=972410); or by hand |
| News | `data/news.json` | LinkedIn posts (see below); or by hand |
| Everything else | `sections/*.html` | by hand |

The nightly job is **Actions → "Update site data"** (04:17 UTC; the *Run workflow*
button runs it now). Visitors see a change as soon as GitHub Pages has published it
(about a minute): the site always asks the server for the newest version.

## News from LinkedIn

LinkedIn does not let other websites read your posts automatically, so there are two ways:

1. **One post at a time (no set-up).** On LinkedIn, open the post's `…` menu →
   *Copy link to post*. On GitHub (also works in the phone app): **Actions →
   "Add news from LinkedIn" → Run workflow**, paste the link, run. Date, text and picture
   are taken from the post. If LinkedIn hides the post from GitHub, type the text in
   the optional *text* box; the Portuguese box is optional too.
2. **Fully automatic.** Create an RSS feed of your LinkedIn posts with a service such as
   rss.app, FetchRSS or a Zapier/Make "new LinkedIn post → RSS" zap. In the repository go
   to **Settings → Secrets and variables → Actions → New repository secret**, name it
   `LINKEDIN_FEED_URL` and paste the feed address. From then on new posts are added every
   night.

To hide an item, add `"hidden": true` to it in `data/news.json`.

## Editing by hand

**News** (`data/news.json`; order does not matter, the site sorts by date):

```json
{
  "date": "2026-08",
  "href": "https://www.linkedin.com/feed/update/urn:li:activity:7490678147051479041/",
  "media": { "kind": "photo", "src": "images/origins2026.jpg", "alt": "Origins 2026" },
  "text": { "en": "Oral presentation at <em>Origins 2026</em>…", "pt": "Comunicação oral na <em>Origins 2026</em>…" },
  "link": { "en": "Post", "pt": "Publicação" }
}
```

`date` can be `2026` (shows "2026") or `2026-08` (shows "Aug 2026"). `media.kind` is
`photo` or `logo`. Leave out `href` for a card without a link. Text may use `<em>`,
`<strong>`, `<i>`, `<b>`, `<br>`; any other HTML is shown as plain text.

**Academic Tree** (`data/tree.json`): each person lists their own `mentors`.

```json
{
  "name": "Laurent Remusat",
  "url": "https://…",
  "photo": "images/tree/remusat.jpg",
  "role": { "en": "Research supervisor · IMPMC", "pt": "Supervisor de investigação · IMPMC" },
  "institution": { "name": "Muséum national d’Histoire naturelle", "url": "https://www.mnhn.fr/en" },
  "nobel": true,
  "mentors": []
}
```

Without `photo`, the card shows the initials (or `"initials": "JF"` to choose them).
People added automatically carry `"source": "academictree"`; give them a photo or a
better role as above (your edits are never overwritten), or remove them for good with
`"hidden": true` (deleting them would let the nightly job add them back).

**Publications** need no editing. To block a paper wrongly attributed to you, add its DOI
to `EXCLUDE` in `tools/update_publications.py`.

Pictures: keep them under 600 KB (about 1600 px wide at most).

## Checks

Every push runs **Actions → "Site checks"**: missing files, heavy pictures, broken data
files, the security policy and JavaScript syntax. A red cross means something to fix.
Locally: `python tools/check_site.py`.

## Security

- The pages carry a Content-Security-Policy: only this site, Google Fonts and the pinned
  map library may run code, so injected scripts are blocked. It lists the fingerprints of
  the small inline scripts in `index.html` and `cientificamente.html`; after editing one,
  run `python tools/check_site.py --fix` (the checks fail and tell you otherwise).
- Text coming from LinkedIn, Chemistry Tree or the data files is cleaned before it is
  shown (`render.js`), and inputs typed in the Actions forms can never run as commands.
- Workflows get only the permissions they need; Dependabot keeps them up to date.
- There are no passwords or keys in this repository, and none are needed.

Recommended GitHub settings (only you can change them):

1. **Two-factor authentication** on your GitHub account (Settings → Password and authentication).
2. **Protect `main`**: Settings → Rules → Rulesets → New branch ruleset → target `main`,
   tick *Restrict deletions* and *Block force pushes*. Your normal pushes and the
   nightly bot keep working.
3. **Secret scanning and push protection**: Settings → Code security → enable both, so a
   password pasted by mistake is caught before it is published.
4. Settings → Actions → General → *Workflow permissions*: **Read repository contents**
   (the two data workflows ask for write access themselves).

## Folders

`sections/` page parts · `data/` generated and editable data · `images/` pictures ·
`tools/` update and check scripts · `i18n/` French and Japanese text · `design-system/`
colours, type and components · `vendor/` pinned third-party libraries.
