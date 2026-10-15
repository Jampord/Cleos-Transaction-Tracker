import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { getGcashTiers, updateTierFee } from "../db/queries";
import { formatPeso, pesosToCentavos } from "../lib/money";
import { Card } from "../ui/components";
import { colors, font, radius, spacing } from "../ui/theme";

type Tier = { id: number; min: number; max: number; fee: number };

export default function FeeTable() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const load = useCallback(() => getGcashTiers().then(setTiers), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={tiers}
      keyExtractor={(t) => String(t.id)}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.sm }}>
          <Stack.Screen options={{ title: "GCash fee table" }} />
          <Text style={{ fontSize: font.body, color: colors.textMuted }}>
            The fee for cash-in and cash-out, by amount. Changes apply to new entries only.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: spacing.md,
          }}
        >
          <Text style={{ fontSize: font.bodyLg, fontWeight: "600", color: colors.text }}>
            {formatPeso(item.min)} – {formatPeso(item.max)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: font.bodyLg, color: colors.textMuted }}>₱</Text>
            <TextInput
              keyboardType="numeric"
              defaultValue={String(item.fee / 100)}
              style={{
                width: 84,
                minHeight: 46,
                textAlign: "right",
                fontSize: font.bodyLg,
                fontWeight: "700",
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: colors.surface,
              }}
              onEndEditing={async (e) => {
                const pesos = Number(e.nativeEvent.text);
                if (!Number.isNaN(pesos) && pesos >= 0) {
                  await updateTierFee(item.id, pesosToCentavos(pesos));
                  load();
                }
              }}
            />
          </View>
        </Card>
      )}
    />
  );
}
