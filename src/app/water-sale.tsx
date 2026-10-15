import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { NameInput } from "../components/NameInput";
import { PaymentHistory } from "../components/PaymentHistory";
import {
  countWaterPayments,
  getKnownNames,
  getWaterRules,
  getWaterSale,
  getWaterStock,
  insertWaterSale,
  softDeleteWaterSale,
  updateWaterSale,
} from "../db/queries";
import { formatPeso, pesosToCentavos } from "../lib/money";
import { Button, Card, Field, InfoPanel, Screen, Segmented } from "../ui/components";
import { colors, font, spacing, typeMeta } from "../ui/theme";

export default function WaterSale() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const [qtyText, setQtyText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [name, setName] = useState("");
  const [paid, setPaid] = useState(true);
  const [cost, setCost] = useState(0); // centavos per gallon, from Settings (new sales only)
  const [stock, setStock] = useState(0);
  const [originalQty, setOriginalQty] = useState(0); // gallons this entry already uses (edit mode)
  const [locked, setLocked] = useState(false);
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    getWaterRules().then((r) => {
      setCost(r.cost);
      if (r.price && editId === null) setPriceText(String(r.price / 100));
    });
    getWaterStock().then(setStock);
    getKnownNames().then(setNames);
  }, []);

  // Edit mode: fill the form from the saved sale.
  useEffect(() => {
    if (editId === null) return;
    (async () => {
      const w = await getWaterSale(editId);
      if (!w) return;
      setQtyText(String(w.quantity));
      setPriceText(String(w.unitPrice / 100));
      setName(w.customerName ?? "");
      setPaid(w.isPaid);
      setOriginalQty(w.quantity);
      setLocked((await countWaterPayments(editId)) > 0);
    })();
  }, [editId]);

  const qty = Number(qtyText);
  const qtyValid = Number.isInteger(qty) && qty > 0;
  const price = Number(priceText);
  const priceValid = priceText.trim() !== "" && !Number.isNaN(price) && price >= 0;
  const total = qtyValid && priceValid ? qty * pesosToCentavos(price) : 0;
  // Stock already counts this sale when editing, so add its old quantity back.
  const left = stock + originalQty - (qtyValid ? qty : 0);

  async function refreshPaymentState() {
    if (editId === null) return;
    const w = await getWaterSale(editId);
    if (w) setPaid(w.isPaid);
    setLocked((await countWaterPayments(editId)) > 0);
  }

  async function save() {
    if (!qtyValid) {
      Alert.alert("Gallons", "Please enter a whole number of gallons.");
      return;
    }
    if (!priceValid) {
      Alert.alert("Price", "Please enter the price per gallon (or set it in Settings).");
      return;
    }
    if (!paid && name.trim() === "") {
      Alert.alert("Unpaid", "Please enter a name for an unpaid entry.");
      return;
    }
    const customerName = name.trim() || null;
    if (editId !== null) {
      await updateWaterSale(
        editId,
        locked ? { customerName } : { quantity: qty, unitPrice: pesosToCentavos(price), customerName, isPaid: paid },
      );
    } else {
      await insertWaterSale({
        quantity: qty,
        unitPrice: pesosToCentavos(price),
        unitCost: cost,
        customerName,
        isPaid: paid,
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
          await softDeleteWaterSale(editId);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: editId !== null ? "Edit water sale" : "Water sale" }} />

      {locked && (
        <Card style={{ backgroundColor: colors.warningBg, borderColor: colors.warningBorder }}>
          <Text style={{ color: colors.warning, fontSize: font.body, fontWeight: "600" }}>
            Payments were recorded for this entry, so only the name can be changed.
          </Text>
        </Card>
      )}
      {editId !== null && <PaymentHistory kind="water" entryId={editId} onChanged={refreshPaymentState} />}

      <Card style={{ gap: spacing.lg }}>
        <Field
          label="Gallons sold"
          keyboardType="numeric"
          value={qtyText}
          onChangeText={setQtyText}
          editable={!locked}
          autoFocus={editId === null}
        />
        <Field
          label="Price per gallon (₱)"
          keyboardType="numeric"
          value={priceText}
          onChangeText={setPriceText}
          editable={!locked}
        />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <NameInput label="Name (optional)" value={name} onChangeText={setName} names={names} />
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

      {qtyValid && priceValid && (
        <InfoPanel
          icon="water"
          color={typeMeta.water.color}
          title="Water sale"
          rows={[
            { label: "Customer pays", value: formatPeso(total), strong: true },
            { label: "Water left after this", value: `${left} gal`, tone: left < 0 ? "danger" : undefined },
          ]}
          note={
            left < 0
              ? {
                  text: `More than the ${stock + originalQty} gallons on record. Add a delivery if you forgot one.`,
                  tone: "danger",
                }
              : undefined
          }
        />
      )}

      <Button label={editId !== null ? "Save changes" : "Save"} icon="checkmark" variant="success" onPress={save} />
      {editId !== null && <Button label="Delete entry" icon="trash-outline" variant="secondary" onPress={remove} />}
    </Screen>
  );
}
