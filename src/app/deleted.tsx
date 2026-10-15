import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { getDeletedEntries, restoreTransaction, restoreWaterDelivery, restoreWaterSale } from "../db/queries";
import { formatDate } from "../lib/dates";
import { formatPeso } from "../lib/money";
import { Button, Card, EmptyState, IconCircle } from "../ui/components";
import { colors, font, IconName, spacing, typeMeta } from "../ui/theme";

type Item = {
  key: string;
  deletedAt: number;
  icon: IconName;
  color: string;
  title: string;
  sub: string;
  restore: () => Promise<void>;
};

export default function Deleted() {
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    const d = await getDeletedEntries();
    const all: Item[] = [
      ...d.transactions.map((t) => ({
        key: `t${t.id}`,
        deletedAt: t.deletedAt ?? 0,
        icon: typeMeta[t.type].icon,
        color: typeMeta[t.type].color,
        title: `${typeMeta[t.type].label} ${formatPeso(t.amount)}`,
        sub: `${formatDate(t.createdAt)} · ${t.customerName ?? "No name"}`,
        restore: () => restoreTransaction(t.id),
      })),
      ...d.water.map((w) => ({
        key: `w${w.id}`,
        deletedAt: w.deletedAt ?? 0,
        icon: typeMeta.water.icon,
        color: typeMeta.water.color,
        title: `Water ${w.quantity} gal · ${formatPeso(w.quantity * w.unitPrice)}`,
        sub: `${formatDate(w.createdAt)} · ${w.customerName ?? "No name"}`,
        restore: () => restoreWaterSale(w.id),
      })),
      ...d.deliveries.map((x) => ({
        key: `d${x.id}`,
        deletedAt: x.deletedAt ?? 0,
        icon: "cube-outline" as IconName,
        color: typeMeta.water.color,
        title: `Delivery ${x.quantity} gal`,
        sub: `${formatDate(x.createdAt)} · ${formatPeso(x.unitCost)} / gal`,
        restore: () => restoreWaterDelivery(x.id),
      })),
    ];
    setItems(all.sort((a, b) => b.deletedAt - a.deletedAt).slice(0, 50));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={items}
      keyExtractor={(i) => i.key}
      ListHeaderComponent={<Stack.Screen options={{ title: "Deleted entries" }} />}
      ListEmptyComponent={<EmptyState icon="trash-outline" title="No deleted entries" />}
      renderItem={({ item }) => (
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <IconCircle name={item.icon} color={item.color} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: font.bodyLg, fontWeight: "700", color: colors.text }}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 14, color: colors.textMuted }}>
                {item.sub}
              </Text>
            </View>
          </View>
          <Button
            label="Restore"
            icon="refresh-outline"
            variant="secondary"
            onPress={async () => {
              await item.restore();
              load();
            }}
          />
        </Card>
      )}
    />
  );
}
