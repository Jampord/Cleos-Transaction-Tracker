import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import {
  getSetting,
  getTransactionsBetween,
  getUtangCustomers,
  getWaterSalesBetween,
  getWaterStock,
} from "../../db/queries";
import { dayRange, formatTime } from "../../lib/dates";
import { formatPeso } from "../../lib/money";
import { summarize } from "../../lib/summary";
import { Card, EmptyState, IconCircle, RoundButton, Row, SectionTitle, Stat } from "../../ui/components";
import { colors, font, IconName, radius, shadow, spacing, typeMeta } from "../../ui/theme";

type Tx = Awaited<ReturnType<typeof getTransactionsBetween>>[number];
type Water = Awaited<ReturnType<typeof getWaterSalesBetween>>[number];
type Item = {
  key: string;
  createdAt: number;
  icon: IconName;
  color: string;
  title: string;
  subtitle: string;
  right: string;
  rightSub?: string;
  unpaid: boolean;
  onPress: () => void;
};

function ActionTile({
  icon,
  color,
  label,
  onPress,
}: {
  icon: IconName;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexBasis: "47%",
          flexGrow: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
        shadow,
      ]}
    >
      <IconCircle name={icon} color={color} size={48} />
      <Text style={{ fontSize: font.bodyLg, fontWeight: "700", color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const [day, setDay] = useState(() => new Date());
  const [txs, setTxs] = useState<Tx[]>([]);
  const [water, setWater] = useState<Water[]>([]);
  const [stock, setStock] = useState(0);
  const [utang, setUtang] = useState(0);
  const [backupStale, setBackupStale] = useState(false);

  const isToday = dayRange(day).start === dayRange().start;
  const dayLabel = isToday ? "Today" : day.toLocaleDateString("en-PH", { weekday: "long" });
  const daySub = day.toLocaleDateString("en-PH", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  const shiftDay = (n: number) => setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));

  useFocusEffect(
    useCallback(() => {
      const { start, end } = dayRange(day);
      Promise.all([
        getTransactionsBetween(start, end),
        getWaterSalesBetween(start, end),
        getWaterStock(),
        getUtangCustomers(),
        getSetting("last_backup_at"),
      ]).then(([t, w, st, u, lb]) => {
        setTxs(t);
        setWater(w);
        setStock(st);
        setUtang(u.reduce((sum, c) => sum + c.balance, 0));
        setBackupStale(Date.now() - Number(lb ?? 0) > 7 * 24 * 60 * 60 * 1000);
      });
    }, [day]),
  );

  const s = summarize(txs, water);

  const items: Item[] = [
    ...txs.map((r) => {
      const m = typeMeta[r.type];
      return {
        key: `t${r.id}`,
        createdAt: r.createdAt,
        icon: m.icon,
        color: m.color,
        title: m.label,
        subtitle: `${r.customerName ?? "No name"} · ${formatTime(r.createdAt)}`,
        right: formatPeso(r.amount),
        rightSub: `Fee ${formatPeso(r.fee)}${r.feeDeducted ? " · deducted" : ""}`,
        unpaid: !r.isPaid,
        onPress: () => router.push({ pathname: "/new", params: { type: r.type, id: String(r.id) } }),
      };
    }),
    ...water.map((w) => ({
      key: `w${w.id}`,
      createdAt: w.createdAt,
      icon: typeMeta.water.icon,
      color: typeMeta.water.color,
      title: `Water · ${w.quantity} gal`,
      subtitle: `${w.customerName ?? "No name"} · ${formatTime(w.createdAt)}`,
      right: formatPeso(w.quantity * w.unitPrice),
      unpaid: !w.isPaid,
      onPress: () => router.push({ pathname: "/water-sale", params: { id: String(w.id) } }),
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
      {backupStale && (
        <Card
          onPress={() => router.push("/backup")}
          style={{
            backgroundColor: colors.warningBg,
            borderColor: colors.warningBorder,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            padding: spacing.md,
          }}
        >
          <IconCircle name="cloud-upload-outline" color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: font.body, fontWeight: "700", color: colors.warning }}>
              No backup in the last 7 days
            </Text>
            <Text style={{ fontSize: 14, color: colors.warning }}>Tap to back up your records</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.warning} />
        </Card>
      )}

      {/* Day picker */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <RoundButton icon="chevron-back" label="Previous day" onPress={() => shiftDay(-1)} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: font.title, fontWeight: "700", color: colors.text }}>{dayLabel}</Text>
          <Text style={{ fontSize: font.caption + 1, color: colors.textMuted }}>{daySub}</Text>
        </View>
        <RoundButton icon="chevron-forward" label="Next day" disabled={isToday} onPress={() => shiftDay(1)} />
      </View>

      {/* New entry */}
      <View style={{ gap: spacing.sm }}>
        <SectionTitle>New entry</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          <ActionTile
            {...typeMeta.cash_in}
            onPress={() => router.push({ pathname: "/new", params: { type: "cash_in" } })}
          />
          <ActionTile
            {...typeMeta.cash_out}
            onPress={() => router.push({ pathname: "/new", params: { type: "cash_out" } })}
          />
          <ActionTile {...typeMeta.load} onPress={() => router.push({ pathname: "/new", params: { type: "load" } })} />
          <ActionTile {...typeMeta.water} onPress={() => router.push("/water-sale")} />
        </View>
      </View>

      {/* Day summary */}
      <View style={{ gap: spacing.sm }}>
        <SectionTitle>{isToday ? "Today's results" : `Results for ${dayLabel}`}</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: "row", gap: spacing.lg }}>
            <Stat
              label="PROFIT"
              value={formatPeso(s.profit)}
              big
              color={s.profit < 0 ? colors.danger : colors.success}
              style={{ flex: 1.4 }}
            />
            <Stat label="SALES" value={formatPeso(s.sales)} />
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Stat label="GCash fees" value={formatPeso(s.gcashFees)} />
            <Stat label="Load" value={formatPeso(s.loadSales)} />
            <Stat label="Water" value={formatPeso(s.waterSales)} hint={`${s.gallonsSold} gal`} />
          </View>
          <Text style={{ fontSize: font.caption + 1, color: colors.textMuted }}>
            GCash moved: {formatPeso(s.cashInVolume)} in · {formatPeso(s.cashOutVolume)} out
          </Text>
        </Card>
      </View>

      {/* Current positions, not tied to the day */}
      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Right now</SectionTitle>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Card onPress={() => router.navigate("/utang")} style={{ flex: 1, padding: spacing.md }}>
            <Stat
              label="Owed to you (utang)"
              value={formatPeso(utang)}
              color={utang > 0 ? colors.warning : colors.text}
            />
          </Card>
          <Card onPress={() => router.navigate("/water")} style={{ flex: 1, padding: spacing.md }}>
            <Stat label="Water left" value={`${stock} gal`} color={stock < 0 ? colors.danger : colors.text} />
          </Card>
        </View>
      </View>

      <SectionTitle>{`Entries · ${items.length}`}</SectionTitle>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={items}
      keyExtractor={(i) => i.key}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon="document-text-outline"
          title="No entries on this day"
          hint={isToday ? "Tap a button above to record one." : undefined}
        />
      }
      renderItem={({ item }) => (
        <Row
          icon={item.icon}
          color={item.color}
          title={item.title}
          subtitle={item.subtitle}
          right={item.right}
          rightSub={item.rightSub}
          chip={item.unpaid ? { label: "Unpaid", tone: "warning" } : undefined}
          onPress={item.onPress}
        />
      )}
    />
  );
}
