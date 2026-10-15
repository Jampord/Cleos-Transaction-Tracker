import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { getUtangCustomers, payCustomer } from "../db/queries";
import type { PayMethod } from "../lib/cashcheck";
import { formatDate } from "../lib/dates";
import { formatPeso, pesosToCentavos } from "../lib/money";
import type { UtangCustomer } from "../lib/utang";
import { Button, Card, EmptyState, Field, Row, Screen, SectionTitle, Segmented, Stat } from "../ui/components";
import { colors, font, spacing } from "../ui/theme";

export default function UtangCustomerScreen() {
  const { customer } = useLocalSearchParams<{ customer: string }>();
  const [data, setData] = useState<UtangCustomer | null>(null);
  const [amountText, setAmountText] = useState("");
  const [selected, setSelected] = useState<string | null>(null); // `${kind}${id}`
  const [methodChoice, setMethodChoice] = useState<PayMethod | null>(null);

  const load = useCallback(async () => {
    const list = await getUtangCustomers();
    setData(list.find((c) => c.key === customer) ?? null);
  }, [customer]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // The entries a payment will go to: just the chosen one, or all (oldest first).
  const chosen = data?.entries.find((e) => `${e.kind}${e.id}` === selected) ?? null;
  const targets = chosen ? [chosen] : (data?.entries ?? []);
  const targetBalance = targets.reduce((sum, e) => sum + e.balance, 0);
  // Cash-out debts are normally settled by GCash transfer; everything else in cash.
  const defaultMethod: PayMethod =
    targets.length > 0 && targets.every((e) => e.txType === "cash_out") ? "gcash" : "cash";
  const method = methodChoice ?? defaultMethod;

  async function pay(amountC: number) {
    if (!data) return;
    await payCustomer(targets, amountC, method);
    setAmountText("");
    setSelected(null);
    setMethodChoice(null);
    const list = await getUtangCustomers();
    const still = list.find((c) => c.key === customer) ?? null;
    if (!still)
      router.back(); // fully paid, nothing left to show
    else setData(still);
  }

  function receive() {
    const n = Number(amountText);
    if (amountText.trim() === "" || Number.isNaN(n) || n <= 0) {
      Alert.alert("Amount", "Please enter the amount received.");
      return;
    }
    const c = pesosToCentavos(n);
    if (c > targetBalance) {
      Alert.alert(
        "Amount",
        `That is more than the balance of ${formatPeso(targetBalance)}${chosen ? " for this entry" : ""}.`,
      );
      return;
    }
    pay(c);
  }

  function payAll() {
    if (!data) return;
    Alert.alert(
      "Paid in full?",
      `${data.name} pays ${formatPeso(targetBalance)}${chosen ? ` for ${chosen.description}` : ""}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => pay(targetBalance) },
      ],
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState icon="checkmark-circle-outline" title="Nothing owed" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: data.name }} />

      <Card>
        <Stat label="BALANCE" value={formatPeso(data.balance)} big color={colors.warning} />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <Field
          label="Amount received (₱)"
          keyboardType="numeric"
          value={amountText}
          onChangeText={setAmountText}
          hint={
            chosen
              ? `Goes to: ${chosen.description}`
              : "Goes to the oldest entries first. Tap an entry below to choose one."
          }
        />
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: font.body, fontWeight: "600", color: colors.text }}>Received by</Text>
          <Segmented
            options={[
              { value: "cash", label: "Cash" },
              { value: "gcash", label: "GCash" },
            ]}
            value={method}
            onChange={(m) => setMethodChoice(m as PayMethod)}
          />
        </View>
        <Button label="Save payment" icon="checkmark" variant="success" onPress={receive} />
        <Button label={chosen ? "Pay this entry in full" : "Paid in full"} variant="secondary" onPress={payAll} />
      </Card>

      <SectionTitle>What they owe for</SectionTitle>
      <View style={{ gap: spacing.sm }}>
        {data.entries.map((e) => {
          const k = `${e.kind}${e.id}`;
          const isChosen = k === selected;
          return (
            <Row
              key={k}
              icon={isChosen ? "checkmark-circle" : "ellipse-outline"}
              color={isChosen ? colors.primary : colors.textMuted}
              title={e.description}
              subtitle={`${formatDate(e.createdAt)}${e.paid > 0 ? ` · paid ${formatPeso(e.paid)} of ${formatPeso(e.owed)}` : ""}`}
              right={formatPeso(e.balance)}
              chip={isChosen ? { label: "Paying this", tone: "info" } : undefined}
              onPress={() => setSelected(isChosen ? null : k)}
            />
          );
        })}
      </View>
    </Screen>
  );
}
