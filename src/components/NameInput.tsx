import { Pressable, Text, View } from "react-native";
import { Field } from "../ui/components";
import { colors, font, radius, spacing, tint } from "../ui/theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  names: string[];
  error?: string;
};

// Text field that suggests names she has used before.
export function NameInput({ label, value, onChangeText, names, error }: Props) {
  const q = value.trim().toLowerCase();
  const matches = q === "" ? [] : names.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 4);

  return (
    <View style={{ gap: spacing.sm }}>
      <Field label={label} value={value} onChangeText={onChangeText} error={error} autoCapitalize="words" />
      {matches.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {matches.map((n) => (
            <Pressable
              key={n}
              onPress={() => onChangeText(n)}
              style={{
                backgroundColor: tint(colors.primary),
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: radius.pill,
              }}
            >
              <Text style={{ fontSize: font.body, fontWeight: "600", color: colors.primary }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
