import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  getWaterDelivery,
  getWaterRules,
  getWaterStock,
  insertWaterDelivery,
  softDeleteWaterDelivery,
  updateWaterDelivery,
} from "../db/queries";
import { pesosToCentavos } from "../lib/money";
import { Button, Card, Field, InfoPanel, Screen } from "../ui/components";
import { spacing, typeMeta } from "../ui/theme";

export default function WaterDelivery() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const [qtyText, setQtyText] = useState("");
  const [costText, setCostText] = useState("");
  const [note, setNote] = useState("");
  const [stock, setStock] = useState(0);
  const [originalQty, setOriginalQty] = useState(0);

  useEffect(() => {
    getWaterRules().then((r) => {
      if (r.cost && editId === null) setCostText(String(r.cost / 100));
    });
    getWaterStock().then(setStock);
  }, []);

  // Edit mode: fill the form from the saved delivery.
  useEffect(() => {
    if (editId === null) return;
    (async () => {
      const d = await getWaterDelivery(editId);
      if (!d) return;
      setQtyText(String(d.quantity));
      setCostText(String(d.unitCost / 100));
      setNote(d.note ?? "");
      setOriginalQty(d.quantity);
    })();
  }, [editId]);

  const qty = Number(qtyText);
  const qtyValid = Number.isInteger(qty) && qty > 0;
  const cost = Number(costText);
  const costValid = costText.trim() !== "" && !Number.isNaN(cost) && cost >= 0;
  // Stock already counts this delivery when editing, so swap the old quantity for the new one.
  const left = stock - originalQty + (qtyValid ? qty : 0);

  async function save() {
    if (!qtyValid) {
      Alert.alert("Gallons", "Please enter a whole number of gallons.");
      return;
    }
    if (!costValid) {
      Alert.alert("Cost", "Please enter the cost per gallon.");
      return;
    }
    const patch = { quantity: qty, unitCost: pesosToCentavos(cost), note: note.trim() || null };
    if (editId !== null) await updateWaterDelivery(editId, patch);
    else await insertWaterDelivery(patch);
    router.back();
  }

  function remove() {
    if (editId === null) return;
    const after = stock - originalQty;
    const message =
      after < 0
        ? `Deleting this will make water left ${after} gallons, because more was sold than delivered. Delete anyway?`
        : "You can bring it back from Settings, under Deleted entries.";
    Alert.alert("Delete this delivery?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await softDeleteWaterDelivery(editId);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: editId !== null ? "Edit delivery" : "New delivery" }} />

      <Card style={{ gap: spacing.lg }}>
        <Field
          label="Gallons delivered"
          keyboardType="numeric"
          value={qtyText}
          onChangeText={setQtyText}
          autoFocus={editId === null}
        />
        <Field label="Cost per gallon (₱)" keyboardType="numeric" value={costText} onChangeText={setCostText} />
        <Field label="Note (optional)" value={note} onChangeText={setNote} />
      </Card>

      {qtyValid && (
        <InfoPanel
          icon="cube-outline"
          color={typeMeta.water.color}
          title="After this delivery"
          rows={[{ label: "Water left", value: `${left} gal`, strong: true, tone: left < 0 ? "danger" : undefined }]}
        />
      )}

      <Button label={editId !== null ? "Save changes" : "Save"} icon="checkmark" variant="success" onPress={save} />
      {editId !== null && <Button label="Delete delivery" icon="trash-outline" variant="secondary" onPress={remove} />}
    </Screen>
  );
}
