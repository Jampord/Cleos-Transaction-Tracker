import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { deleteClosing, getClosings, getFlowInputs, insertClosing } from "../../db/queries";
import { expectedChange, Flow } from "../../lib/cashcheck";
import { formatDateTime } from "../../lib/dates";
import { formatPeso, pesosToCentavos } from "../../lib/money";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconCircle,
  Row,
  Screen,
  SectionTitle,
  Stat,
} from "../../ui/components";
import { colors, font, IconName, spacing } from "../../ui/theme";

type Closing = Awaited<ReturnType<typeof getClosings>>[number];

// "12.5" -> 1250 centavos; empty or invalid -> null.
function parse(s: string): number | null {
  const n = Number(s);
  if (s.trim() === "" || Number.isNaN(n) || n < 0) return null;
  return pesosToCentavos(n);
}

function Diff({ diff }: { diff: number | null }) {
  if (diff === null) return null;
  if (diff === 0) return <Chip label="Matches" tone="success" />;
  return (
    <Chip label={`${diff < 0 ? "Short" : "Over"} ${formatPeso(Math.abs(diff))}`} tone={diff < 0 ? "danger" : "info"} />
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: font.body, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: font.body, color: colors.text, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const signed = (c: number) => (c >= 0 ? "+" : "−") + formatPeso(Math.abs(c));

function BalanceCard({
  title,
  icon,
  color,
  last,
  change,
  expected,
  text,
  onChangeText,
  diff,
}: {
  title: string;
  icon: IconName;
  color: string;
  last: number;
  change: number;
  expected: number;
  text: string;
  onChangeText: (t: string) => void;
  diff: number | null;
}) {
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <IconCircle name={icon} color={color} />
        <Text style={{ fontSize: font.title, fontWeight: "700", color: colors.text }}>{title}</Text>
      </View>
      <Stat label="SHOULD HAVE" value={formatPeso(expected)} big />
      <Line label="Last count" value={formatPeso(last)} />
      <Line label="Since then" value={signed(change)} />
      <Field label="Counted now (₱)" keyboardType="numeric" value={text} onChangeText={onChangeText} />
      <Diff diff={diff} />
    </Card>
  );
}

export default function CashCheck() {
  const [closings, setClosings] = useState<Closing[]>([]);
  const [flow, setFlow] = useState<Flow>({ cash: 0, gcash: 0 });
  const [loaded, setLoaded] = useState(false);
  const [cashText, setCashText] = useState("");
  const [gcashText, setGcashText] = useState("");

  const load = useCallback(async () => {
    const list = await getClosings(8);
    setClosings(list);
    if (list.length > 0) {
      setFlow(expectedChange(await getFlowInputs(), list[0].createdAt));
    }
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const last = closings[0] ?? null;
  const actualCash = parse(cashText);
  const actualGcash = parse(gcashText);

  async function saveOpening() {
    if (actualCash === null || actualGcash === null) {
      Alert.alert("Balances", "Please enter both amounts (0 if none).");
      return;
    }
    await insertClosing({ kind: "opening", actualCash, actualGcash, expectedCash: null, expectedGcash: null });
    setCashText("");
    setGcashText("");
    load();
  }

  async function saveCheck() {
    if (!last || actualCash === null || actualGcash === null) {
      Alert.alert("Balances", "Please enter both amounts (0 if none).");
      return;
    }
    const expectedCash = last.actualCash + flow.cash;
    const expectedGcash = last.actualGcash + flow.gcash;
    const record = async () => {
      await insertClosing({ kind: "closing", actualCash, actualGcash, expectedCash, expectedGcash });
      setCashText("");
      setGcashText("");
      load();
    };
    if (actualCash !== expectedCash || actualGcash !== expectedGcash) {
      Alert.alert("There is a difference", "The next check will start from the amounts you typed. Save anyway?", [
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: record },
      ]);
    } else {
      record();
    }
  }

  function removeLast() {
    if (!last) return;
    Alert.alert(
      "Delete the latest count?",
      last.kind === "opening"
        ? "You will be asked for starting balances again."
        : "Expected balances will go back to the count before it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteClosing(last.id);
            load();
          },
        },
      ],
    );
  }

  if (!loaded)
    return (
      <Screen>
        <EmptyState icon="time-outline" title="Loading…" />
      </Screen>
    );

  // First time: starting balances.
  if (!last) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Cash check" }} />
        <Card style={{ gap: spacing.lg }}>
          <Text style={{ fontSize: font.title, fontWeight: "700", color: colors.text }}>Starting balances</Text>
          <Text style={{ fontSize: font.body, color: colors.textMuted }}>
            Count what you have right now. The app will check your next count against this.
          </Text>
          <Field label="Cash in the drawer (₱)" keyboardType="numeric" value={cashText} onChangeText={setCashText} />
          <Field label="GCash balance (₱)" keyboardType="numeric" value={gcashText} onChangeText={setGcashText} />
          <Button label="Save starting balances" icon="checkmark" variant="success" onPress={saveOpening} />
        </Card>
      </Screen>
    );
  }

  const expectedCash = last.actualCash + flow.cash;
  const expectedGcash = last.actualGcash + flow.gcash;
  const cashDiff = actualCash === null ? null : actualCash - expectedCash;
  const gcashDiff = actualGcash === null ? null : actualGcash - expectedGcash;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Cash check" }} />
      <Text style={{ fontSize: font.body, color: colors.textMuted }}>
        Since the count on {formatDateTime(last.createdAt)}
      </Text>

      <BalanceCard
        title="Cash drawer"
        icon="cash-outline"
        color={colors.cashIn}
        last={last.actualCash}
        change={flow.cash}
        expected={expectedCash}
        text={cashText}
        onChangeText={setCashText}
        diff={cashDiff}
      />
      <BalanceCard
        title="GCash wallet"
        icon="phone-portrait-outline"
        color={colors.primary}
        last={last.actualGcash}
        change={flow.gcash}
        expected={expectedGcash}
        text={gcashText}
        onChangeText={setGcashText}
        diff={gcashDiff}
      />

      <Button label="Save count" icon="checkmark" variant="success" onPress={saveCheck} />

      <SectionTitle>Earlier counts</SectionTitle>
      <View style={{ gap: spacing.sm }}>
        {closings.map((c) => {
          const off =
            (c.expectedCash !== null && c.actualCash !== c.expectedCash) ||
            (c.expectedGcash !== null && c.actualGcash !== c.expectedGcash);
          return (
            <Row
              key={c.id}
              icon={off ? "alert-circle" : "checkmark-circle"}
              color={off ? colors.warning : colors.success}
              title={c.kind === "opening" ? "Starting balances" : off ? "Count with a difference" : "Count matched"}
              subtitle={`${formatDateTime(c.createdAt)} · Cash ${formatPeso(c.actualCash)}${
                c.expectedCash !== null ? ` (${signed(c.actualCash - c.expectedCash)})` : ""
              } · GCash ${formatPeso(c.actualGcash)}${
                c.expectedGcash !== null ? ` (${signed(c.actualGcash - c.expectedGcash)})` : ""
              }`}
            />
          );
        })}
      </View>

      <Button label="Delete latest count" icon="trash-outline" variant="secondary" onPress={removeLast} />
    </Screen>
  );
}
