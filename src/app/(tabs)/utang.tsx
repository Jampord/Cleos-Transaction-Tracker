import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { getUtangCustomers } from "../../db/queries";
import { formatDate } from "../../lib/dates";
import { formatPeso } from "../../lib/money";
import type { UtangCustomer } from "../../lib/utang";
import { Card, EmptyState, Row, SectionTitle, Stat } from "../../ui/components";
import { colors, spacing } from "../../ui/theme";

export default function Utang() {
  const [list, setList] = useState<UtangCustomer[]>([]);

  useFocusEffect(
    useCallback(() => {
      getUtangCustomers().then(setList);
    }, []),
  );

  const total = list.reduce((sum, c) => sum + c.balance, 0);

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
      <Card>
        <Stat
          label="TOTAL OWED TO YOU"
          value={formatPeso(total)}
          big
          color={total > 0 ? colors.warning : colors.text}
        />
      </Card>
      <SectionTitle>{`Customers · ${list.length}`}</SectionTitle>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={list}
      keyExtractor={(c) => c.key}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="Nobody owes you money" />}
      renderItem={({ item }) => (
        <Row
          icon="person-circle"
          color={colors.primary}
          title={item.name}
          subtitle={`${item.entries.length} ${item.entries.length === 1 ? "entry" : "entries"} · since ${formatDate(item.entries[0].createdAt)}`}
          right={formatPeso(item.balance)}
          chevron
          onPress={() => router.push({ pathname: "/utang-customer", params: { customer: item.key } })}
        />
      )}
    />
  );
}
