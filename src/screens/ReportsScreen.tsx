import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  Line as SvgLine,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatAmount } from '../utils/currency';
import { getDateRangeTimestamps } from '../utils/date';
import {
  useCategoryBreakdown,
  usePeriodTotals,
  useTimeSeriesData,
  useKhumusData,
  TimeRange,
} from '../hooks/useComputed';
import { useAllTransactions } from '../hooks/useTransactions';
import { useCategoriesMap } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import {
  exportTransactionsCSV,
  exportHTMLReport,
  ExportTransaction,
} from '../utils/export';

// ─── Time filter config ───────────────────────────────────────────────────────

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '1D', label: '1D' },
  { key: '7D', label: '7D' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
];

const RANGE_TO_DATE_KEY: Record<TimeRange, Parameters<typeof getDateRangeTimestamps>[0]> = {
  '1D': 'today',
  '7D': 'week',
  '1M': 'month',
  '3M': 'month', // will override below
  '1Y': 'year',
};

function getRangeBounds(range: TimeRange): { start: number; end: number } {
  if (range === '3M') {
    const now = Date.now();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return { start: threeMonthsAgo.getTime(), end: now };
  }
  return getDateRangeTimestamps(RANGE_TO_DATE_KEY[range]);
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

const CHART_HEIGHT = 220;
const PAD = { top: 18, right: 14, bottom: 28, left: 46 };

interface ChartProps {
  data: { label: string; income: number; expense: number }[];
  width: number;
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const dx = (curr.x - prev.x) * 0.35;
    d += ` C ${(prev.x + dx).toFixed(1)} ${prev.y.toFixed(1)}, ${(curr.x - dx).toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  return d;
}

function LineChart({ data, width }: ChartProps) {
  const [touchedIndex, setTouchedIndex] = useState<number | null>(null);

  const cW = width - PAD.left - PAD.right;
  const cH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const maxVal = useMemo(() => {
    const m = Math.max(...data.flatMap((d) => [d.income, d.expense]), 0);
    return m > 0 ? m * 1.15 : 1000;
  }, [data]);

  const xPos = (i: number) =>
    PAD.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2);
  const yPos = (v: number) => PAD.top + cH - (v / maxVal) * cH;

  const incPts = data.map((d, i) => ({ x: xPos(i), y: yPos(d.income) }));
  const expPts = data.map((d, i) => ({ x: xPos(i), y: yPos(d.expense) }));

  const incPath = buildSmoothPath(incPts);
  const expPath = buildSmoothPath(expPts);

  const bottom = PAD.top + cH;

  function buildArea(pts: { x: number; y: number }[], linePath: string): string {
    if (!linePath || pts.length < 2) return '';
    return `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + cH * (1 - t),
    label: formatYLabel(maxVal * t),
  }));

  function handleTouch(evt: { nativeEvent: { locationX: number } }) {
    const lx = evt.nativeEvent.locationX;
    if (data.length === 0) return;
    const step = data.length > 1 ? cW / (data.length - 1) : cW;
    const idx = Math.round((lx - PAD.left) / step);
    setTouchedIndex(Math.max(0, Math.min(data.length - 1, idx)));
  }

  const touched = touchedIndex !== null ? data[touchedIndex] : null;
  const touchX = touchedIndex !== null ? xPos(touchedIndex) : 0;

  // Label visibility: show every Nth label to avoid crowding
  const labelStep = Math.ceil(data.length / 7);

  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={() => setTouchedIndex(null)}
    >
      <Svg width={width} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#22C87A" stopOpacity={0.18} />
            <Stop offset="100%" stopColor="#22C87A" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#E05C5C" stopOpacity={0.15} />
            <Stop offset="100%" stopColor="#E05C5C" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <SvgLine
            key={i}
            x1={PAD.left}
            y1={t.y}
            x2={PAD.left + cW}
            y2={t.y}
            stroke={colors.surfaceBorder}
            strokeWidth={0.5}
          />
        ))}

        {/* Y labels */}
        {yTicks.map((t, i) => (
          <SvgText
            key={i}
            x={PAD.left - 6}
            y={t.y + 4}
            fontSize={8}
            fill={colors.textDisabled}
            textAnchor="end"
            fontFamily={fonts.mono}
          >
            {t.label}
          </SvgText>
        ))}

        {/* Area fills */}
        {incPath && (
          <Path d={buildArea(incPts, incPath)} fill="url(#incGrad)" />
        )}
        {expPath && (
          <Path d={buildArea(expPts, expPath)} fill="url(#expGrad)" />
        )}

        {/* Income line */}
        {incPath && (
          <Path
            d={incPath}
            stroke={colors.income}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Expense line */}
        {expPath && (
          <Path
            d={expPath}
            stroke={colors.expense}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X labels */}
        {data.map((d, i) => {
          if (!d.label) return null;
          if (i !== 0 && i !== data.length - 1 && i % labelStep !== 0) return null;
          return (
            <SvgText
              key={i}
              x={xPos(i)}
              y={CHART_HEIGHT - 6}
              fontSize={8.5}
              fill={colors.textMuted}
              textAnchor="middle"
              fontFamily={fonts.sans}
            >
              {d.label}
            </SvgText>
          );
        })}

        {/* Touch indicator */}
        {touched && touchedIndex !== null && (
          <>
            <SvgLine
              x1={touchX}
              y1={PAD.top}
              x2={touchX}
              y2={bottom}
              stroke={colors.brandViolet}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            {/* Income dot */}
            <Circle
              cx={touchX}
              cy={yPos(touched.income)}
              r={5}
              fill={colors.income}
              stroke="white"
              strokeWidth={1.5}
            />
            {/* Expense dot */}
            <Circle
              cx={touchX}
              cy={yPos(touched.expense)}
              r={5}
              fill={colors.expense}
              stroke="white"
              strokeWidth={1.5}
            />
            {/* Tooltip */}
            <Rect
              x={Math.min(touchX + 6, PAD.left + cW - 82)}
              y={PAD.top + 4}
              width={78}
              height={44}
              rx={6}
              fill={colors.brandNavy}
            />
            <SvgText
              x={Math.min(touchX + 45, PAD.left + cW - 43)}
              y={PAD.top + 17}
              fontSize={8}
              fill={colors.income}
              textAnchor="middle"
              fontFamily={fonts.mono}
            >
              + {formatYLabel(touched.income)}
            </SvgText>
            <SvgText
              x={Math.min(touchX + 45, PAD.left + cW - 43)}
              y={PAD.top + 30}
              fontSize={8}
              fill={colors.expense}
              textAnchor="middle"
              fontFamily={fonts.mono}
            >
              − {formatYLabel(touched.expense)}
            </SvgText>
            {touched.label ? (
              <SvgText
                x={Math.min(touchX + 45, PAD.left + cW - 43)}
                y={PAD.top + 42}
                fontSize={7}
                fill="rgba(255,255,255,0.5)"
                textAnchor="middle"
                fontFamily={fonts.sans}
              >
                {touched.label}
              </SvgText>
            ) : null}
          </>
        )}
      </Svg>
    </View>
  );
}

function formatYLabel(val: number): string {
  if (val >= 100_000) return `${(val / 100_000).toFixed(1)}L`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return Math.round(val).toString();
}

// ─── Chart Legend ─────────────────────────────────────────────────────────────

function ChartLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
        <Text style={styles.legendText}>Income</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
        <Text style={styles.legendText}>Expense</Text>
      </View>
    </View>
  );
}

// ─── Category bar row ─────────────────────────────────────────────────────────

function CategoryBreakdownRow({
  name,
  color,
  amount,
  percentage,
  currency,
  index,
}: {
  name: string;
  color: string;
  amount: number;
  percentage: number;
  currency: string;
  index: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -12 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', delay: 100 + index * 40, damping: 22, stiffness: 280 }}
      style={styles.catRow}
    >
      <View style={[styles.catIcon, { backgroundColor: color + '25' }]}>
        <View style={[styles.catIconDot, { backgroundColor: color }]} />
      </View>
      <View style={styles.catMid}>
        <View style={styles.catTopRow}>
          <Text style={styles.catName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.catAmount, { color }]}>
            {currency} {formatAmount(amount)}
          </Text>
        </View>
        <View style={styles.catBarTrack}>
          <MotiView
            from={{ width: '0%' }}
            animate={{ width: `${Math.max(2, percentage)}%` }}
            transition={{ type: 'spring', delay: 200 + index * 40, damping: 22, stiffness: 200 }}
            style={[styles.catBarFill, { backgroundColor: color }]}
          />
        </View>
        <Text style={styles.catPct}>{percentage.toFixed(1)}% of total</Text>
      </View>
    </MotiView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const currency = useSettingsStore((s) => s.defaultCurrency);

  const [activeRange, setActiveRange] = useState<TimeRange>('1M');
  const [chartWidth, setChartWidth] = useState(320);
  const [exporting, setExporting] = useState(false);

  const { start, end } = useMemo(() => getRangeBounds(activeRange), [activeRange]);
  const periodTotals = usePeriodTotals(start, end);
  const chartData = useTimeSeriesData(activeRange);
  const breakdown = useCategoryBreakdown(start, end);
  const allTx = useAllTransactions();
  const catMap = useCategoriesMap();
  const { due: khumusDue } = useKhumusData();

  const rangeName = useMemo(() => {
    const map: Record<TimeRange, string> = {
      '1D': 'Today',
      '7D': 'Last 7 Days',
      '1M': 'This Month',
      '3M': 'Last 3 Months',
      '1Y': 'This Year',
    };
    return map[activeRange];
  }, [activeRange]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const txsInRange = allTx.filter(
        (t) => t.created_at >= start && t.created_at <= end
      );
      const exportTxs: ExportTransaction[] = txsInRange.map((t) => ({
        id: t.id,
        flow: t.flow,
        amount: t.amount,
        currency: t.currency,
        categoryName: catMap.get(t.category_id)?.name ?? 'Unknown',
        status: t.status,
        method: t.method,
        note: t.note ?? undefined,
        khumus_share: t.khumus_share ?? undefined,
        created_at: t.created_at,
      }));
      await exportHTMLReport({
        period: rangeName,
        income: periodTotals.income,
        expense: periodTotals.expense,
        net: periodTotals.net,
        khumusDue,
        currency,
        transactions: exportTxs,
        categoryBreakdown: breakdown.map((b) => ({
          name: b.categoryName,
          amount: b.amount,
          percentage: b.percentage,
        })),
      });
    } catch (err) {
      Alert.alert('Export Failed', 'Could not generate the report. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const isEmpty = periodTotals.income === 0 && periodTotals.expense === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Reports</Text>
      </MotiView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
      >
        {/* Time filter pills */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', delay: 60, duration: 200 }}
          style={styles.rangeRow}
        >
          {TIME_RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangePill, activeRange === r.key && styles.rangePillActive]}
              onPress={() => setActiveRange(r.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.rangePillText, activeRange === r.key && styles.rangePillTextActive]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </MotiView>

        {/* Summary cards */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 80, damping: 22, stiffness: 280 }}
          style={styles.summaryRow}
        >
          <View style={[styles.summaryCard, styles.summaryCardIncome]}>
            <Text style={styles.summaryCardLabel}>Income</Text>
            <Text style={[styles.summaryCardValue, { color: colors.income }]}>
              {currency} {formatAmount(periodTotals.income)}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardExpense]}>
            <Text style={styles.summaryCardLabel}>Expense</Text>
            <Text style={[styles.summaryCardValue, { color: colors.expense }]}>
              {currency} {formatAmount(periodTotals.expense)}
            </Text>
          </View>
        </MotiView>

        {isEmpty ? (
          /* Empty state */
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', delay: 140, duration: 240 }}
            style={styles.emptyWrap}
          >
            <View style={styles.emptyIcon}>
              <Ionicons name="bar-chart-outline" size={36} color={colors.textDisabled} />
            </View>
            <Text style={styles.emptyTitle}>No data for {rangeName}</Text>
            <Text style={styles.emptySubtitle}>
              Add transactions to see your financial overview here
            </Text>
          </MotiView>
        ) : (
          <>
            {/* Chart card */}
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 120, damping: 22, stiffness: 260 }}
              style={styles.chartCard}
            >
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Income vs Expense</Text>
                <Text style={styles.chartSubtitle}>{rangeName}</Text>
              </View>
              <ChartLegend />
              <View
                onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                style={styles.chartArea}
              >
                {chartWidth > 0 && <LineChart data={chartData} width={chartWidth} />}
              </View>
            </MotiView>

            {/* Category breakdown */}
            {breakdown.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 180, damping: 22, stiffness: 270 }}
                style={styles.section}
              >
                <Text style={styles.sectionTitle}>Spending by Category</Text>
                <View style={styles.card}>
                  {breakdown.slice(0, 8).map((item, i) => (
                    <View key={item.categoryId}>
                      {i > 0 && <View style={styles.divider} />}
                      <CategoryBreakdownRow
                        name={item.categoryName}
                        color={item.categoryColor}
                        amount={item.amount}
                        percentage={item.percentage}
                        currency={currency}
                        index={i}
                      />
                    </View>
                  ))}
                </View>
              </MotiView>
            )}
          </>
        )}

        {/* Export button */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 250, damping: 22, stiffness: 280 }}
          style={styles.exportSection}
        >
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExport}
            activeOpacity={0.85}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons name="document-text-outline" size={18} color={colors.textPrimary} />
            )}
            <Text style={styles.exportBtnText}>
              {exporting ? 'Generating…' : 'Export PDF Report'}
            </Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  /* Range pills */
  rangeRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  rangePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  rangePillActive: {
    backgroundColor: colors.brandNavy,
  },
  rangePillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  rangePillTextActive: {
    color: colors.textInverse,
  },
  /* Summary cards */
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  summaryCardIncome: {
    backgroundColor: colors.incomeBg,
  },
  summaryCardExpense: {
    backgroundColor: colors.expenseBg,
  },
  summaryCardLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  summaryCardValue: {
    fontFamily: fonts.mono,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  /* Chart card */
  chartCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingTop: 16,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chartTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chartSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  chartArea: {
    marginTop: 4,
  },
  /* Section */
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
  },
  /* Category row */
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  catIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catMid: {
    flex: 1,
    gap: 5,
  },
  catTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catName: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  catAmount: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: -0.2,
  },
  catBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  catPct: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: colors.textDisabled,
  },
  /* Export */
  exportSection: {},
  exportBtn: {
    backgroundColor: colors.brandYellow,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  exportBtnDisabled: {
    opacity: 0.6,
  },
  exportBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  /* Empty state */
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
