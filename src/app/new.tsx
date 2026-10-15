import {
  countTxPayments,
  getGcashTiers,
  getKnownNames,
  getLoadCostPercent,
  getLoadFeeRule,
  getTransaction,
  insertTransaction,
  softDeleteTransaction,
  updateTransaction,
} from "@/db/queries";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { NameInput } from "../components/NameInput";
import { PaymentHistory } from "../components/PaymentHistory";
import { FeeTier, lookupGcashFee, lookupLoadFee } from "../lib/fees";
import { formatPeso, pesosToCentavos } from "../lib/money";
import { Button, Card, Field, InfoPanel, Screen, Segmented } from "../ui/components";
import { colors, font, spacing, typeMeta } from "../ui/theme";

type TxType = "cash_in" | "cash_out" | "load";

export default function NewEntry() {
  const params = useLocalSearchParams<{ type: TxType; id?: string }>();
  const type = params.type;
  const editId = params.id ? Number(params.id) : null;

  const [amountText, setAmountText] = useState("");
  const [feeText, setFeeText] = useState("");
  const [feeEdited, setFeeEdited] = useState(false); // true once she types her own fee
  const [name, setName] = useState("");
  const [paid, setPaid] = useState(true);
  const [feeDeducted, setFeeDeducted] = useState(false); // cash-out only
  const [locked, setLocked] = useState(false); // has payments: only the name can change
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [loadRule, setLoadRule] = useState({ threshold: 10000, fee: 500 });
  const [names, setNames] = useState<string[]>([]);
  const [costPercent, setCostPercent] = useState(100);
  const [orig, setOrig] = useState<{ amount: number; cost: number | null } | null>(null);

  useEffect(() => {
    getGcashTiers().then(setTiers);
    getLoadFeeRule().then(setLoadRule);
    getKnownNames().then(setNames);
    getLoadCostPercent().then(setCostPercent);
  }, []);

  // Edit mode: fill the form from the saved entry.
  useEffect(() => {
    if (editId === null) return;
    (async () => {
      const t = await getTransaction(editId);

      if (!t) return;
      setAmountText(String(t.amount / 100));
      setFeeText(String(t.fee / 100));
      setFeeEdited(true); // keep the saved fee; don't recompute it
      setName(t.customerName ?? "");
      setPaid(t.isPaid);
      setFeeDeducted(t.feeDeducted);
      setLocked((await countTxPayments(editId)) > 0);
      setOrig({ amount: t.amount, cost: t.cost });
    })();
  }, [editId]);

  const isCashOut = type === "cash_out";
  const amount = Number(amountText);
  const amountValid = amountText.trim() !== "" && !Number.isNaN(amount) && amount > 0;
  const amountC = amountValid ? pesosToCentavos(amount) : 0;

  // Fee suggested from the tables. null = amount is outside the GCash table.
  const autoFee =
    type === "load" ? lookupLoadFee(amountC, loadRule.threshold, loadRule.fee) : lookupGcashFee(amountC, tiers);
  const outsideTable = type !== "load" && amountValid && autoFee === null;

  // Keep the fee box in sync until she edits it herself.
  useEffect(() => {
    if (feeEdited) return;
    setFeeText(amountValid && autoFee !== null ? String(autoFee / 100) : "");
  }, [amountText, tiers, loadRule, feeEdited]);

  const feeNum = Number(feeText || 0);
  const feeC = Number.isNaN(feeNum) || feeNum < 0 ? 0 : pesosToCentavos(feeNum);

  // What she does at the counter, as label/value rows.
  const counterRows: { label: string; value: string; strong?: boolean }[] = [];
  if (amountValid) {
    if (isCashOut && feeDeducted) {
      counterRows.push({ label: "Give customer", value: formatPeso(amountC - feeC), strong: true });
      counterRows.push({ label: "Fee you keep", value: formatPeso(feeC) });
    } else if (isCashOut) {
      counterRows.push({ label: "Give customer", value: formatPeso(amountC), strong: true });
      counterRows.push({ label: "Customer also pays fee", value: formatPeso(feeC) });
    } else {
      counterRows.push({ label: "Customer pays", value: formatPeso(amountC + feeC), strong: true });
      counterRows.push({ label: "Fee included", value: formatPeso(feeC) });
    }
  }

  // After a payment is removed, the entry may be unpaid again and unlocked.
  async function refreshPaymentState() {
    if (editId === null) return;
    const t = await getTransaction(editId);
    if (t) setPaid(t.isPaid);
    setLocked((await countTxPayments(editId)) > 0);
  }

  async function save() {
    if (!amountValid) {
      Alert.alert("Amount", "Please enter the amount first.");
      return;
    }
    if (outsideTable && feeText.trim() === "") {
      Alert.alert("Fee", "This amount is not in the fee table. Please enter the fee.");
      return;
    }
    if (isCashOut && feeDeducted && feeC > amountC) {
      Alert.alert("Fee", "The fee is larger than the amount.");
      return;
    }
    if (!paid && name.trim() === "") {
      Alert.alert("Unpaid", "Please enter a name for an unpaid entry.");
      return;
    }
    const customerName = name.trim() || null;
    // Cost of a load: set when it is made; scaled if the amount is edited later.
    let cost: number | null = null;
    if (type === "load") {
      if (editId === null) cost = Math.round((amountC * costPercent) / 100);
      else if (orig && orig.cost !== null) cost = Math.round((orig.cost * amountC) / orig.amount);
    }
    if (editId !== null) {
      await updateTransaction(
        editId,
        locked
          ? { customerName }
          : { amount: amountC, fee: feeC, customerName, isPaid: paid, cost, feeDeducted: isCashOut && feeDeducted },
      );
    } else {
      await insertTransaction({
        type,
        amount: amountC,
        fee: feeC,
        customerName,
        isPaid: paid,
        cost,
        feeDeducted: isCashOut && feeDeducted,
      });
    }
    router.back();
  }

  function remove() {
    if (editId === null) return;
    if (locked) {
      Alert.alert("Can't delete", "Payments were recorded for this entry, so it can't be deleted.");
      return;
    }
    Alert.alert("Delete this entry?", "You can bring it back from Settings, under Deleted entries.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await softDeleteTransaction(editId);
          router.back();
        },
      },
    ]);
  }

  const meta = typeMeta[type] ?? typeMeta.cash_in;

  return (
    <Screen>
      <Stack.Screen options={{ title: (editId !== null ? "Edit " : "") + meta.label }} />

      {locked && (
        <Card style={{ backgroundColor: colors.warningBg, borderColor: colors.warningBorder }}>
          <Text style={{ color: colors.warning, fontSize: font.body, fontWeight: "600" }}>
            Payments were recorded for this entry, so only the name can be changed.
          </Text>
        </Card>
      )}
      {editId !== null && <PaymentHistory kind="tx" entryId={editId} onChanged={refreshPaymentState} />}

      <Card style={{ gap: spacing.lg }}>
        <Field
          label="Amount (₱)"
          keyboardType="numeric"
          value={amountText}
          onChangeText={setAmountText}
          editable={!locked}
          autoFocus={editId === null}
        />
        <Field
          label="Fee (₱)"
          keyboardType="numeric"
          value={feeText}
          editable={!locked}
          onChangeText={(t) => {
            setFeeText(t);
            setFeeEdited(true);
          }}
          error={outsideTable ? "Above ₱10,000. Please type the fee." : undefined}
          hint={editId !== null && !locked ? "If you change the amount, check the fee too." : undefined}
        />
        {isCashOut && (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: font.body, fontWeight: "600", color: colors.text }}>Fee</Text>
            <Segmented
              options={[
                { value: "top", label: "Fee on top" },
                { value: "deducted", label: "Fee deducted" },
              ]}
              value={feeDeducted ? "deducted" : "top"}
              onChange={(v) => {
                if (!locked) setFeeDeducted(v === "deducted");
              }}
            />
            <Text style={{ fontSize: 14, color: colors.textMuted }}>
              {feeDeducted
                ? "You hand over the amount minus the fee."
                : "The customer pays the fee in addition to the amount."}
            </Text>
          </View>
        )}
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <NameInput label="Name or number (optional)" value={name} onChangeText={setName} names={names} />
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: font.body, fontWeight: "600", color: colors.text }}>Payment</Text>
          <Segmented
            options={[
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Unpaid" },
            ]}
            value={paid ? "paid" : "unpaid"}
            onChange={(v) => {
              if (!locked) setPaid(v === "paid");
            }}
          />
        </View>
      </Card>

      {counterRows.length > 0 && (
        <InfoPanel icon={meta.icon} color={meta.color} title="At the counter" rows={counterRows} />
      )}

      <Button label={editId !== null ? "Save changes" : "Save"} icon="checkmark" variant="success" onPress={save} />
      {editId !== null && <Button label="Delete entry" icon="trash-outline" variant="secondary" onPress={remove} />}
    </Screen>
  );
}
