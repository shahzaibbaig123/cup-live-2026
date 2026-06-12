import { StyleSheet, View } from 'react-native';

import type { MatchForecast, Outcome } from '@/api/predictions';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

const HOME_COLOR = Palette.accent;
const DRAW_COLOR = Palette.textSecondary;
const AWAY_COLOR = '#5B8DEF';

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Segment({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: number;
  color: string;
  highlight: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <ThemedText type="caption" secondary numberOfLines={1} style={styles.legendLabel}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={highlight ? { color } : undefined}>
        {pct(value)}
      </ThemedText>
    </View>
  );
}

/** Win / draw / loss probability bar with a labelled legend. */
export function ForecastBar({
  forecast,
  homeLabel,
  awayLabel,
}: {
  forecast: Pick<MatchForecast, 'pHome' | 'pDraw' | 'pAway' | 'predicted'>;
  homeLabel: string;
  awayLabel: string;
}) {
  const { pHome, pDraw, pAway, predicted } = forecast;
  const total = pHome + pDraw + pAway || 1;
  const widths: Record<Outcome, number> = {
    home: (pHome / total) * 100,
    draw: (pDraw / total) * 100,
    away: (pAway / total) * 100,
  };
  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <Segment label={homeLabel} value={pHome} color={HOME_COLOR} highlight={predicted === 'home'} />
        <Segment label="Draw" value={pDraw} color={DRAW_COLOR} highlight={predicted === 'draw'} />
        <Segment label={awayLabel} value={pAway} color={AWAY_COLOR} highlight={predicted === 'away'} />
      </View>
      <View style={styles.bar}>
        <View style={{ width: `${widths.home}%`, backgroundColor: HOME_COLOR }} />
        <View style={{ width: `${widths.draw}%`, backgroundColor: DRAW_COLOR }} />
        <View style={{ width: `${widths.away}%`, backgroundColor: AWAY_COLOR }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    maxWidth: 70,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.border,
  },
});
