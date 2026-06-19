{
  "plugins": [
    "react",
    "import"
  ],
  "rules": {
    "react/forbid-elements": [
      "warn",
      {
        "forbid": []
      }
    ],
    "no-restricted-imports": [
      "warn",
      {
        "patterns": [
          {
            "group": [
              "components/core/**",
              "components/feedback/**",
              "ui_kits/portfolio/**"
            ],
            "message": "Import design-system components from 'index.js', not component internals."
          }
        ]
      }
    ],
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
        "message": "Raw hex color — use a design-system color token via var()."
      },
      {
        "selector": "Literal[value=/\\b\\d+px\\b/]",
        "message": "Raw px value — use a design-system spacing token via var()."
      },
      {
        "selector": "Literal[value=/font-family\\s*:\\s*(?!['\\\"]?(?:Fraunces|Manrope))/i]",
        "message": "Font not provided by the design system. Available: Fraunces, Manrope."
      },
      {
        "selector": "JSXOpeningElement[name.name='Button'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|variant|size|href|onClick|disabled|icon|type|key|ref|className|style|children)$/]",
        "message": "<Button> doesn't accept that prop. Declared props: children, variant, size, href, onClick, disabled, icon, type."
      },
      {
        "selector": "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:primary|ghost|cta)$/]",
        "message": "<Button> variant must be one of 'primary' | 'ghost' | 'cta'."
      },
      {
        "selector": "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:sm|md)$/]",
        "message": "<Button> size must be one of 'sm' | 'md'."
      },
      {
        "selector": "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='type'] > Literal[value!=/^(?:button|submit|reset)$/]",
        "message": "<Button> type must be one of 'button' | 'submit' | 'reset'."
      },
      {
        "selector": "JSXOpeningElement[name.name='Card'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|interactive|padding|style|key|ref|className|style|children)$/]",
        "message": "<Card> doesn't accept that prop. Declared props: children, interactive, padding, style."
      },
      {
        "selector": "JSXOpeningElement[name.name='IconButton'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|label|onClick|size|key|ref|className|style|children)$/]",
        "message": "<IconButton> doesn't accept that prop. Declared props: children, label, onClick, size."
      },
      {
        "selector": "JSXOpeningElement[name.name='MetricStat'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|label|href|key|ref|className|style|children)$/]",
        "message": "<MetricStat> doesn't accept that prop. Declared props: value, label, href."
      },
      {
        "selector": "JSXOpeningElement[name.name='NewsWindow'] > JSXAttribute > JSXIdentifier[name!=/^(?:title|action|children|key|ref|className|style|children)$/]",
        "message": "<NewsWindow> doesn't accept that prop. Declared props: title, action, children."
      },
      {
        "selector": "JSXOpeningElement[name.name='PresoBadge'] > JSXAttribute > JSXIdentifier[name!=/^(?:type|children|key|ref|className|style|children)$/]",
        "message": "<PresoBadge> doesn't accept that prop. Declared props: type, children."
      },
      {
        "selector": "JSXOpeningElement[name.name='PresoBadge'] > JSXAttribute[name.name='type'] > Literal[value!=/^(?:oral|poster)$/]",
        "message": "<PresoBadge> type must be one of 'oral' | 'poster'."
      },
      {
        "selector": "JSXOpeningElement[name.name='StatusDot'] > JSXAttribute > JSXIdentifier[name!=/^(?:status|size|key|ref|className|style|children)$/]",
        "message": "<StatusDot> doesn't accept that prop. Declared props: status, size."
      },
      {
        "selector": "JSXOpeningElement[name.name='StatusDot'] > JSXAttribute[name.name='status'] > Literal[value!=/^(?:live|warn|danger)$/]",
        "message": "<StatusDot> status must be one of 'live' | 'warn' | 'danger'."
      },
      {
        "selector": "JSXOpeningElement[name.name='Tag'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|key|ref|className|style|children)$/]",
        "message": "<Tag> doesn't accept that prop. Declared props: children."
      },
      {
        "selector": "JSXOpeningElement[name.name='TimelineItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:logo|title|meta|children|last|key|ref|className|style|children)$/]",
        "message": "<TimelineItem> doesn't accept that prop. Declared props: logo, title, meta, children, last."
      }
    ]
  },
  "overrides": [
    {
      "files": [
        "**/index.js"
      ],
      "rules": {
        "no-restricted-imports": "off"
      }
    }
  ],
  "x-omelette": {
    "components": {
      "Button": {
        "replaces": []
      },
      "Card": {
        "replaces": []
      },
      "IconButton": {
        "replaces": []
      },
      "MetricStat": {
        "replaces": []
      },
      "NewsWindow": {
        "replaces": []
      },
      "PresoBadge": {
        "replaces": []
      },
      "StatusDot": {
        "replaces": []
      },
      "Tag": {
        "replaces": []
      },
      "TimelineItem": {
        "replaces": []
      }
    },
    "tokens": [
      "--accent",
      "--accent-strong",
      "--bg",
      "--bg-2",
      "--bg-nebula",
      "--blur-nav",
      "--blur-overlay",
      "--blur-soft",
      "--border",
      "--border-strong",
      "--card",
      "--card-hover",
      "--dur-base",
      "--dur-fast",
      "--dur-slow",
      "--ease-out",
      "--font-body",
      "--font-display",
      "--font-mono",
      "--fw-bold",
      "--fw-extrabold",
      "--fw-medium",
      "--fw-regular",
      "--fw-semibold",
      "--glow-frame",
      "--grad-cosmic",
      "--grad-cosmic-soft",
      "--leading-body",
      "--leading-tight",
      "--max-width",
      "--muted",
      "--nav-h",
      "--nebula-blue",
      "--nebula-cyan",
      "--nebula-magenta",
      "--nebula-violet",
      "--on-accent",
      "--radius-lg",
      "--radius-md",
      "--radius-pill",
      "--radius-sm",
      "--shadow",
      "--shadow-card-hover",
      "--shadow-glow-cyan",
      "--shadow-modal",
      "--shadow-panel",
      "--space-1",
      "--space-2",
      "--space-3",
      "--space-4",
      "--space-5",
      "--space-6",
      "--space-8",
      "--space-section",
      "--status-danger",
      "--status-live",
      "--status-warn",
      "--text",
      "--text-body",
      "--text-brand",
      "--text-chip",
      "--text-eyebrow",
      "--text-h2",
      "--text-hero",
      "--text-lead",
      "--text-meta",
      "--text-metric",
      "--text-sm",
      "--tracking-eyebrow",
      "--tracking-tight"
    ],
    "tokenKinds": {
      "--bg": "color",
      "--bg-2": "color",
      "--card": "color",
      "--card-hover": "color",
      "--border": "color",
      "--border-strong": "color",
      "--text": "font",
      "--muted": "color",
      "--accent": "color",
      "--accent-strong": "color",
      "--nebula-violet": "color",
      "--nebula-cyan": "color",
      "--nebula-blue": "color",
      "--nebula-magenta": "color",
      "--grad-cosmic": "color",
      "--grad-cosmic-soft": "color",
      "--on-accent": "color",
      "--status-live": "color",
      "--status-warn": "color",
      "--status-danger": "color",
      "--font-display": "font",
      "--font-body": "font",
      "--font-mono": "font",
      "--fw-regular": "other",
      "--fw-medium": "other",
      "--fw-semibold": "other",
      "--fw-bold": "other",
      "--fw-extrabold": "other",
      "--text-hero": "font",
      "--text-brand": "font",
      "--text-h2": "font",
      "--text-metric": "font",
      "--text-lead": "font",
      "--text-body": "font",
      "--text-sm": "font",
      "--text-meta": "font",
      "--text-chip": "font",
      "--text-eyebrow": "font",
      "--leading-body": "font",
      "--leading-tight": "font",
      "--tracking-eyebrow": "font",
      "--tracking-tight": "font",
      "--radius-lg": "radius",
      "--radius-md": "radius",
      "--radius-sm": "radius",
      "--radius-pill": "radius",
      "--space-1": "spacing",
      "--space-2": "spacing",
      "--space-3": "spacing",
      "--space-4": "spacing",
      "--space-5": "spacing",
      "--space-6": "spacing",
      "--space-8": "spacing",
      "--space-section": "spacing",
      "--max-width": "spacing",
      "--nav-h": "spacing",
      "--shadow": "shadow",
      "--shadow-card-hover": "shadow",
      "--shadow-glow-cyan": "shadow",
      "--shadow-modal": "shadow",
      "--shadow-panel": "shadow",
      "--glow-frame": "shadow",
      "--ease-out": "other",
      "--dur-fast": "other",
      "--dur-base": "other",
      "--dur-slow": "other",
      "--blur-nav": "other",
      "--blur-overlay": "other",
      "--blur-soft": "other",
      "--bg-nebula": "color"
    },
    "fontFamilies": [
      "Fraunces",
      "Manrope"
    ]
  }
}