import { css } from '../../src/css/index';

const brandPrimary = css.color('#3b82f6');

export const theme = css.tokens({
  colors: {
    primary: brandPrimary,
    surface: css.color('#ffffff'),
  },
  spacing: css.scale({
    base: css.rem(0.25),
    ratio: 2,
    steps: { sm: 1, md: 2, lg: 3 }
  })
});
