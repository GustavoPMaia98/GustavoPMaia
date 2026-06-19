A single highlight statistic — a large cyan Fraunces number above a small uppercase label. Used in the hero metrics strip.

```jsx
<MetricStat value="3" label="Publications" />
<MetricStat value="2" label="h-index" href="https://scholar.google.com/…" />
```

Pass `href` to make the whole stat a link (the number brightens on hover). Lay several out in a flex row with ~28px gap.
