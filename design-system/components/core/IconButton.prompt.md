Square bordered ghost button for icon-only actions — search, theme/language toggles, nav tools. Holds a Lucide SVG or a short text label.

```jsx
<IconButton label="Search the site"><i data-lucide="search"></i></IconButton>
<IconButton label="Switch language">PT</IconButton>
```

Default 38×38; pass `size` to resize. Gains a faint wash + cyan border on hover. Always pass `label` for accessibility.
