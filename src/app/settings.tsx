import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Switch, Text, View } from "react-native";
import { getSetting, resetTestData, setSetting } from "../db/queries";
import { Button, Card, Field, Row, Screen, SectionTitle, Segmented } from "../ui/components";
import { applyMode, colors, font, spacing, ThemeMode } from "../ui/theme";

// A number saved to the settings table. `scale` 100 = pesos stored as centavos.
function SettingNumber({
  label,
  settingKey,
  scale,
  hint,
  min = 0,
  max,
}: {
  label: string;
  settingKey: string;
  scale: number;
  hint?: string;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getSetting(settingKey).then((v) => setText(v ? String(Number(v) / scale) : ""));
  }, [settingKey, scale]);

  const save = async () => {
    const n = Number(text);
    if (text.trim() === "" || Number.isNaN(n) || n < min || (max !== undefined && n > max)) {
      setError(max !== undefined ? `Enter a number from ${min} to ${max}` : "Enter a valid amount");
      setSaved(false);
      return;
    }
    setError(undefined);
    await setSetting(settingKey, String(Math.round(n * scale)));
    setSaved(true);
  };

  return (
    <Field
      label={label}
      value={text}
      keyboardType="numeric"
      onChangeText={(t) => {
        setText(t);
        setSaved(false);
      }}
      onEndEditing={save}
      error={error}
      hint={saved ? "Saved ✓" : hint}
    />
  );
}

function SwitchRow({ label, hint, settingKey }: { label: string; hint?: string; settingKey: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    getSetting(settingKey).then((v) => setOn(v === "1"));
  }, [settingKey]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: font.body, fontWeight: "600", color: colors.text }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{hint}</Text> : null}
      </View>
      <Switch
        value={on}
        onValueChange={(v) => {
          setOn(v);
          setSetting(settingKey, v ? "1" : "0");
        }}
        trackColor={{ true: colors.primary }}
      />
    </View>
  );
}

const cardTitle = () => ({ fontSize: font.title, fontWeight: "700" as const, color: colors.text });

function AppearanceSetting() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    getSetting("theme_mode").then((v) => setMode((v as ThemeMode | null) ?? "light"));
  }, []);

  return (
    <Card style={{ gap: spacing.md }}>
      <Segmented
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "Automatic" },
        ]}
        value={mode}
        onChange={async (m) => {
          setMode(m as ThemeMode);
          await setSetting("theme_mode", m);
          applyMode(m as ThemeMode);
        }}
      />
      <Text style={{ fontSize: 14, color: colors.textMuted }}>
        Automatic follows your phone's own light/dark setting.
      </Text>
    </Card>
  );
}

export default function Settings() {
  return (
    <Screen>
      <Stack.Screen options={{ title: "Settings" }} />

      <SectionTitle>Appearance</SectionTitle>
      <AppearanceSetting />

      <SectionTitle>Pricing</SectionTitle>
      <Row
        icon="receipt-outline"
        color={colors.cashIn}
        title="GCash fee table"
        subtitle="Fee for each cash-in and cash-out amount"
        chevron
        onPress={() => router.push("/fee-table")}
      />

      <Card style={{ gap: spacing.lg }}>
        <Text style={cardTitle()}>Load</Text>
        <SettingNumber label="Fee on small loads (₱)" settingKey="load_fee" scale={100} />
        <SettingNumber label="Charge that fee on loads below (₱)" settingKey="load_fee_threshold" scale={100} />
        <SettingNumber
          label="Load cost (% of face value)"
          settingKey="load_cost_percent"
          scale={1}
          min={1}
          max={100}
          hint="What actually leaves your GCash wallet for a load. Applies to new loads."
        />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <Text style={cardTitle()}>Water (per gallon)</Text>
        <SettingNumber label="Selling price (₱)" settingKey="water_price" scale={100} />
        <SettingNumber label="Cost from supplier (₱)" settingKey="water_cost" scale={100} />
      </Card>

      <SectionTitle>Cash check</SectionTitle>
      <Card style={{ gap: spacing.lg }}>
        <SwitchRow label="Load is bought from my GCash wallet" settingKey="load_from_gcash" />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SwitchRow label="Water deliveries are paid from the cash drawer" settingKey="deliveries_from_cash" />
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Row
        icon="cloud-upload-outline"
        color={colors.primary}
        title="Backup and restore"
        subtitle="Save a copy of all records"
        chevron
        onPress={() => router.push("/backup")}
      />
      <Row
        icon="trash-outline"
        color={colors.textMuted}
        title="Deleted entries"
        subtitle="Bring back something deleted by mistake"
        chevron
        onPress={() => router.push("/deleted")}
      />

      {__DEV__ && (
        <Button
          label="DEV: delete all entries"
          variant="danger"
          icon="warning-outline"
          onPress={() =>
            Alert.alert("Delete all entries?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => resetTestData() },
            ])
          }
        />
      )}
    </Screen>
  );
}
