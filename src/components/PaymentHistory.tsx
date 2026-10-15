import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { getTxPayments, getWaterPayments, removeTxPayment, removeWaterPayment } from "../db/queries";
import { formatDate } from "../lib/dates";
import { formatPeso } from "../lib/money";
import { Card, SectionTitle } from "../ui/components";
import { colors, font, spacing } from "../ui/theme";

type P = { id: number; amount: number; paidAt: number; method: string };
type Props = { kind: "tx" | "water"; entryId: number; onChanged: () => void };

export function PaymentHistory({ kind, entryId, onChanged }: Props) {
  const [list, setList] = useState<P[]>([]);

  const load = useCallback(async () => {
    const rows = kind === "tx" ? await getTxPayments(entryId) : await getWaterPayments(entryId);
    setList(rows);
  }, [kind, entryId]);

  useEffect(() => {
    load();
  }, [load]);

  if (list.length === 0) return null;

  const remove = (p: P) =>
    Alert.alert(
      "Remove this payment?",
      `${formatPeso(p.amount)} received on ${formatDate(p.paidAt)} will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (kind === "tx") await removeTxPayment(p.id, entryId);
            else await removeWaterPayment(p.id, entryId);
            await load();
            onChanged();
          },
        },
      ],
    );

  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionTitle>Payments received</SectionTitle>
      {list.map((p) => (
        <View key={p.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: font.bodyLg, fontWeight: "700", color: colors.text }}>{formatPeso(p.amount)}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>
              {formatDate(p.paidAt)} · {p.method === "gcash" ? "GCash" : "Cash"}
            </Text>
          </View>
          <Pressable onPress={() => remove(p)} hitSlop={8} style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
            <Text style={{ color: colors.danger, fontSize: font.body, fontWeight: "700" }}>Remove</Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}
