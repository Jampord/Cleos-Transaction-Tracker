import { useEffect, useState } from "react";
import { Switch, Text, TextInput, View } from "react-native";
import { getLoadCostPercent, getSetting, setSetting } from "../db/queries";

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ fontSize: 17, flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

export function CashCheckSettings() {
  const [loadGcash, setLoadGcash] = useState(false);
  const [delCash, setDelCash] = useState(false);
  const [pct, setPct] = useState("100");

  useEffect(() => {
    getSetting("load_from_gcash").then((v) => setLoadGcash(v === "1"));
    getSetting("deliveries_from_cash").then((v) => setDelCash(v === "1"));
    getLoadCostPercent().then((n) => setPct(String(n)));
  }, []);

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22 }}>Cash check</Text>
      <Row
        label="Load is bought from my GCash wallet"
        value={loadGcash}
        onChange={(v) => {
          setLoadGcash(v);
          setSetting("load_from_gcash", v ? "1" : "0");
        }}
      />
      <Row
        label="Water deliveries are paid from the cash drawer"
        value={delCash}
        onChange={(v) => {
          setDelCash(v);
          setSetting("deliveries_from_cash", v ? "1" : "0");
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ fontSize: 17, flex: 1 }}>Load cost (% of face value)</Text>
        <TextInput
          style={{ fontSize: 18, borderWidth: 1, padding: 6, width: 90 }}
          keyboardType="numeric"
          value={pct}
          onChangeText={setPct}
          onEndEditing={(e) => {
            const n = Number(e.nativeEvent.text);
            if (n > 0 && n <= 100) setSetting("load_cost_percent", String(n));
          }}
        />
      </View>
    </View>
  );
}
