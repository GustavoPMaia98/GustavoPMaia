Primary action button — a cyan→blue gradient pill with near-black text; use for the single most important action in a view.

```jsx
<Button variant="primary" onClick={save}>Download CV</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="cta">Cientifica(mente)</Button>
```

Variants: `primary` (gradient, default), `ghost` (outline, secondary), `cta` (italic Fraunces on the fixed cosmic gradient — reserved for the tutoring sub-brand). Sizes: `sm`, `md` (default). Pass `href` to render as a link, `icon` for a leading icon node, `disabled` to dim and block. Lifts 2px + glows on hover; settles on press. No shrink-scale.
