import { border, color, css,px ,rem} from 'auwla/css';

// 1. Color Palettes (generated using our new color.palette OKLCH curves)
export const brand = css.color.palette('oklch(0.62 0.18 290)');    // Violet
export const accent = css.color.palette('oklch(0.72 0.16 195)');   // Teal/Cyan
export const slate = css.color.palette('#1e293b');                // Slates for neutral text/bg

// 2. Interactive States
export const primaryButtonColors = css.color.group({
  base: brand[600],
  hover: 'lighten(0.08)',
  active: 'darken(0.08)',
  disabled: 'alpha(0.35)',
});

export const accentButtonColors = css.color.group({
  base: accent[600],
  hover: 'lighten(0.08)',
  active: 'darken(0.08)',
  disabled: 'alpha(0.35)',
});

// 3. Spacing Scale
export const space = css.scale({
  base: css.rem(0.25),
  ratio: 1.5,
  steps: {
    xs: 1, // 0.25rem
    sm: 2, // 0.375rem
    md: 3, // 0.5625rem
    lg: 4, // 0.84rem
    xl: 5, // 1.26rem
    '2xl': 6, // 1.89rem
  }
});

// 4. Shell Layout Styles
export const globalLayout = css.define({
  background: color('#09090b'), // Deep rich dark
  color: slate[100],
  minHeight: css.vh(100),
  flex: css.flex({
    direction: 'row',
  }),
});

export const sidebar = css.define({
  width: css.px(260),
  background: color('rgba(18, 18, 24, 0.6)'),
  borderRight: css.border({ color: slate[800].alpha(0.5), width: 1, style: 'solid' }),
  backdropFilter: 'blur(12px)',
  padding: space.lg,
  flex: css.flex({
    direction: 'column',
    gap: space.lg,
  })
});

export const sidebarTitle = css.define({
  fontSize: css.rem(1.2),
  fontWeight: '800',
  color: color('#fff'),
  margin: [px(10), css.zero(), px(2), css.zero()],
  letterSpacing: css.rem(-0.02),
});

export const sidebarSubtitle = css.define({
  fontSize: css.rem(0.75),
  color: color('#64748b'),
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: css.rem(0.05),
});

export const sidebarNav = css.define({
  flexGrow: 1,
  marginTop: space.xl,
  flex: css.flex({
    direction: 'column',
    gap: space.sm,
  }),
});

export const sidebarFooter = css.define({
  borderTop: css.border({ color: slate[800].alpha(0.2), width: 1, style: 'solid' }),
  paddingTop: space.lg,
  flex: css.flex({
    direction: 'row',
    align: 'center',
    gap: space.md,
  })
});

export const avatar = css.define({
  width: css.px(32),
  height: css.px(32),
  borderRadius: css.pct(50),
  background: css.gradient({
    angle: 135,
    stops: [
      [brand[500], 0],
      [accent[500], 100]
    ]
  })
});

export const avatarName = css.define({
  fontSize: css.rem(0.8),
  fontWeight: '600',
  color: '#fff',
});

export const avatarEmail = css.define({
  fontSize: css.rem(0.7),
  color: slate[400],
});

export const contentWrapper = css.define({
  flexGrow: 1,
  flex: css.flex({
    direction: 'column',
  })
});

export const sidebarLink = css.define({
  display: 'block',
  padding: [space.md, space.lg],
  borderRadius: css.px(8),
  textDecoration: 'none',
  fontSize: css.rem(0.9),
  fontWeight: '500',
  transition: css.transition({
    background: { duration: css.ms(200) },
    transform:  { duration: css.ms(300), easing: css.ease('out') },
  }),
  color: slate[400],
  border: css.border({ color: css.color.transparent, width: 1, style: 'solid' }),
  ':hover': {
    color: slate[100],
    background: slate[800].alpha(0.3),
  },
  '&.active': {
    background: brand[900].alpha(0.4),
    color: brand[300],
    border: css.border({ color: brand[700].alpha(0.6), width: 1, style: 'solid' }),
  }
});

// 5. Dashboard Styles
export const mainContent = css.define({
  flexGrow: 1,
  padding: space['2xl'],
  overflowY: 'auto',
  maxHeight: '100vh',
  flex: css.flex({
    direction: 'column',
    gap: space.xl,
  })
});

export const headerTitle = css.define({
  fontSize: css.rem(1.8),
  fontWeight: '700',
  color: '#fff',
  margin: 0,
});

export const headerDesc = css.define({
  color: slate[400],
  margin: [space.xs, css.zero(), css.zero(), css.zero()],
  fontSize: css.rem(0.9),
});

export const headerTelemetryRow = css.define({
  flex: css.flex({
    direction: 'row',
    align: 'center',
    gap: space.md,
  })
});

export const headerTelemetry = css.define({
  fontSize: css.rem(0.85),
  color: slate[400],
  fontWeight: '500',
});

export const glassPanel = css.define({
  background: 'rgba(18, 18, 24, 0.4)',
  backdropFilter: 'blur(16px)',
  border: css.border({ color: slate[800].alpha(0.5), width: 1, style: 'solid' }),
  borderRadius: css.px(16),
  padding: space.xl,
  boxShadow: css.shadow({ x: 0, y: 8, blur: 32, color: css.color.black.alpha(0.2) }),
});

export const metricsGrid = css.define({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: space.lg,
});

export const metricCard = css.define({
  background: 'rgba(24, 24, 32, 0.4)',
  border: css.border({ color: slate[800].alpha(0.4), width: 1, style: 'solid' }),
  borderRadius: css.px(12),
  padding: space.xl,
  transition: css.transition({ all: { duration: css.ms(200) } }),
  flex: css.flex({
    direction: 'column',
    gap: space.sm,
  }),
  ':hover': {
    transform: css.transform({ translateY: css.px(-4) }),
    borderColor: brand[800].alpha(0.8),
  }
});

export const metricLabel = css.define({
  fontSize: css.rem(0.85),
  color: slate[400],
  fontWeight: '600',
  letterSpacing: css.rem(0.02),
});

export const metricValue = css.define({
  fontSize: css.rem(2.2),
  fontWeight: '700',
  color: slate[50],
});

export const metricTrend = css.define((props: { variant: 'up' | 'down' | 'online' | 'warning' | 'offline' }) => ({
  fontSize: css.rem(0.8),
  fontWeight: '500',
  ...css.match(props.variant, {
    up: { color: accent[400] },
    down: { color: css.color('#ef4444') },
    online: { color: accent[400] },
    warning: { color: css.color('#eab308') },
    offline: { color: css.color('#ef4444') },
  })
}));

export const chartHeader = css.define({
  marginBottom: space.xl,
  flex: css.flex({
    direction: 'row',
    justify: 'space-between',
    align: 'center',
  })
});

export const chartTitle = css.define({
  fontSize: css.rem(1.1),
  color: '#fff',
  margin: 0,
});

export const chartSubtitle = css.define({
  color: slate[400],
  margin: [space.xs, css.zero(), css.zero(), css.zero()],
  fontSize: css.rem(0.85),
});

export const filterGroup = css.define({
  background: 'rgba(9, 9, 11, 0.4)',
  padding: space.xs,
  borderRadius: px(8),
  flex: css.flex({
    direction: 'row',
    gap: space.xs,
  })
});

export const filterButton = css.define({
  padding: [space.sm, space.lg],
  borderRadius: px(6),
  fontSize: rem(0.8),
});

export const chartContainer = css.define({
  position: 'relative',
  width: css.pct(100),
  height: css.px(180),
  overflow: 'hidden',
});

export const chartSvg = css.define({
  overflow: 'visible',
});

export const chartArea = css.define({
  transition: 'd 0.3s ease',
});

export const chartLine = css.define({
  transition: 'd 0.3s ease',
});

export const chartPoint = css.define({
  transition: 'cx 0.3s ease, cy 0.3s ease',
  stroke: brand[500],
  ':last-child': {
    stroke: accent[500],
  }
});

export const btn = css.define((props: { variant: 'primary' | 'accent' | 'outline' }) => ({
  padding: [space.md, space.lg],
  borderRadius: px(8),
  fontWeight: '600',
  fontSize: rem(0.9),
  cursor: 'pointer',
  border: border.none(),
  transition: css.transition({ all: { duration: css.ms(150) } }),
  ...css.match(props.variant, {
    primary: {
      background: primaryButtonColors.base,
      color: primaryButtonColors.base.contrast(),
      ':hover': { background: primaryButtonColors.hover },
      ':active': { background: primaryButtonColors.active },
    },
    accent: {
      background: accentButtonColors.base,
      color: accentButtonColors.base.contrast(),
      ':hover': { background: accentButtonColors.hover },
      ':active': { background: accentButtonColors.active },
    },
    outline: {
      background: 'transparent',
      border: css.border({ color: slate[700], width: 1, style: 'solid' }),
      color: slate[200],
      ':hover': {
        background: slate[800].alpha(0.3),
        borderColor: slate[400],
        color: slate[50],
      }
    }
  })
}));

export const flexRow = css.define({
  flex: css.flex({
    direction: 'row',
    align: 'center',
    justify: 'space-between',
    gap: space.lg,
  })
});

export const statusDot = css.define((props: { status: 'online' | 'warning' | 'offline' }) => ({
  width: px(8),
  height: px(8),
  borderRadius: css.pct(50),
  display: 'inline-block',
  boxShadow: '0 0 8px currentColor',
  ...css.match(props.status, {
    online: { color: accent[400], background: accent[400] },
    warning: { color:color('#eab308'), background: color('#eab308')},
    offline: { color:color('#ef4444'), background: color('#ef4444') },
  })
}));

export const inputField = css.define({
  background: color('rgba(9, 9, 11, 0.6)'),
  border: border({ color: slate[800], width: 1, style: 'solid' }),
  borderRadius: px(8),
  color: slate[50],
  padding: [space.md, space.lg],
  fontSize: rem(5),
  width: css.pct(100),
  outline: 'none',
  transition: css.transition({ 'border-color': { duration: css.ms(200) } }),
  ':focus': {
    borderColor: brand[900],
  }
});

// 6. AI Workspace Styles
export const workspaceLayout = css.define({
  grid: css.grid({
    columns: [css.fr(1), css.px(280)],
    gap: space.xl,
    alignItems: 'start',
  }),
  opacity:10
});

export const chatContainer = css.define({
  height: css.px(480),
  padding: space.lg,
  flex: css.flex({
    direction: 'column',
    gap: space.md,
  })
});

export const messageFeed = css.define({
  flexGrow: 1,
  overflowY: 'auto',
  paddingRight: space.xs,
  flex: css.flex({
    direction: 'column',
    gap: space.md,
  })
});

export const messageBubble = css.define((props: { role: 'user' | 'assistant' }) => ({
  maxWidth: css.pct(80),
  borderRadius: css.px(12),
  padding: [space.md, space.lg],
  fontSize: css.rem(0.9),
  lineHeight: '1.4',
  ...css.match(props.role, {
    user: {
      alignSelf: 'flex-end',
      background: brand[600],
      color: '#fff',
      borderBottomRightRadius: css.px(2),
    },
    assistant: {
      alignSelf: 'flex-start',
      background: 'rgba(255,255,255,0.04)',
      border: css.border({ color: slate[800].alpha(0.5), width: 1, style: 'solid' }),
      color: slate[200],
      borderBottomLeftRadius: css.px(2),
    }
  })
}));

export const typingDots = css.define({
  display: 'inline-flex',
  gap: css.px(4),
});

export const chatForm = css.define({
  flex: css.flex({
    direction: 'row',
    align: 'center',
    gap: space.md,
  })
});

export const workspaceConfig = css.define({
  padding: space.lg,
  flex: css.flex({
    direction: 'column',
    gap: space.xl,
  })
});

export const configTitle = css.define({
  fontSize: css.rem(1),
  color: '#fff',
  margin: 0,
  borderBottom: css.border({ color: slate[800].alpha(0.5), width: 1, style: 'solid' }),
  paddingBottom: space.md,
});

export const configItem = css.define({
  flex: css.flex({
    direction: 'column',
    gap: space.sm,
  })
});

export const configLabelRow = css.define({
  fontSize: css.rem(0.85),
  flex: css.flex({
    direction: 'row',
    align: 'center',
    justify: 'space-between',
  })
});

export const configLabel = css.define({
  color: slate[400],
  fontWeight: '500',
});

export const configValue = css.define({
  color: accent[400],
  fontWeight: '600',
});

export const sliderInput = css.define({
  accentColor: accent[400],
  width: css.pct(100),
});

export const configHelp = css.define({
  fontSize: css.rem(0.75),
  color: slate[500],
});
