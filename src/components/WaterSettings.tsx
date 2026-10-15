import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { getWaterRules, setSetting } from "../db/queries";
import { pesosToCentavos } from "../lib/money";

const box = { fontSize: 18, borderWidth: 1, padding: 6, width: 90 };

export function WaterSettings() {
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    getWaterRules().then((r) => {
      setPrice(r.price ? String(r.price / 100) : "");
      setCost(r.cost ? String(r.cost / 100) : "");
    });
  }, []);

  const save = (key: string, text: string) => {
    const n = Number(text);
    if (text.trim() !== "" && !Number.isNaN(n) && n >= 0) {
      setSetting(key, String(pesosToCentavos(n)));
    }
  };

  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22 }}>Water (per gallon)</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 18 }}>Selling price (₱)</Text>
        <TextInput
          style={box}
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
          onEndEditing={(e) => save("water_price", e.nativeEvent.text)}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 18 }}>Cost from supplier (₱)</Text>
        <TextInput
          style={box}
          keyboardType="numeric"
          value={cost}
          onChangeText={setCost}
          onEndEditing={(e) => save("water_cost", e.nativeEvent.text)}
        />
      </View>
    </View>
  );
}
