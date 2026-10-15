import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { getWaterDeliveries, getWaterStock } from "../../db/queries";
import { formatDate } from "../../lib/dates";
import { formatPeso } from "../../lib/money";
import { Button, Card, EmptyState, Row, SectionTitle, Stat } from "../../ui/components";
import { colors, spacing, typeMeta } from "../../ui/theme";

type Delivery = Awaited<ReturnType<typeof getWaterDeliveries>>[number];

export default function Water() {
  const [list, setList] = useState<Delivery[]>([]);
  const [stock, setStock] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getWaterDeliveries().then(setList);
      getWaterStock().then(setStock);
    }, []),
  );

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
      <Card style={{ gap: spacing.lg }}>
        <Stat label="WATER LEFT" value={`${stock} gal`} big color={stock < 0 ? colors.danger : colors.text} />
        <Button
          label="Record a delivery"
          icon="add"
          color={typeMeta.water.color}
          onPress={() => router.push("/water-delivery")}
        />
      </Card>
      <SectionTitle>{`Deliveries · ${list.length}`}</SectionTitle>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={list}
      keyExtractor={(d) => String(d.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState icon="cube-outline" title="No deliveries yet" hint="Record one when water arrives." />
      }
      renderItem={({ item }) => (
        <Row
          icon="cube-outline"
          color={typeMeta.water.color}
          title={`${item.quantity} gal`}
          subtitle={`${formatDate(item.createdAt)}${item.note ? ` · ${item.note}` : ""}`}
          right={`${formatPeso(item.unitCost)} / gal`}
          chevron
          onPress={() => router.push({ pathname: "/water-delivery", params: { id: String(item.id) } })}
        />
      )}
    />
  );
}
