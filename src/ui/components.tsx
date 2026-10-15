import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, font, IconName, radius, shadow, spacing, tint } from "./theme";

// ---------- Layout ----------
export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const pad = { padding: spacing.lg, gap: spacing.lg };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.bg }, pad, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[pad, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shadow,
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: font.caption,
        fontWeight: "700",
        color: colors.textMuted,
        letterSpacing: 0.8,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

// ---------- Buttons ----------
type Variant = "primary" | "success" | "danger" | "secondary" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  color,
  size = "md",
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    color ??
    {
      primary: colors.primary,
      success: colors.success,
      danger: colors.danger,
      secondary: colors.surface,
      ghost: "transparent",
    }[variant];
  const fg =
    variant === "secondary" && !color ? colors.text : variant === "ghost" && !color ? colors.primary : colors.onFill;
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          minHeight: size === "lg" ? 60 : 52,
          paddingHorizontal: spacing.lg,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === "secondary" && !color ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={22} color={fg} /> : null}
          <Text
            numberOfLines={2}
            style={{ color: fg, fontSize: font.bodyLg, fontWeight: "700", textAlign: "center", flexShrink: 1 }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function RoundButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

// ---------- Small pieces ----------
export function IconCircle({ name, color, size = 44 }: { name: IconName; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint(color),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size * 0.52} color={color} />
    </View>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
export function Chip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const map: Record<Tone, [string, string]> = {
    neutral: [colors.chip, colors.textMuted],
    success: [colors.successBg, colors.success],
    warning: [colors.warningBg, colors.warning],
    danger: [colors.dangerBg, colors.danger],
    info: [colors.infoBg, colors.info],
  };
  const [bg, fg] = map[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radius.pill,
      }}
    >
      <Text style={{ color: fg, fontSize: font.caption, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Stat({
  label,
  value,
  hint,
  big,
  color,
  style,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <Text style={{ fontSize: font.caption, color: colors.textMuted, fontWeight: "600" }}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontSize: big ? font.display : font.title,
          fontWeight: "700",
          color: color ?? colors.text,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
      {hint ? <Text style={{ fontSize: font.caption, color: colors.textMuted }}>{hint}</Text> : null}
    </View>
  );
}

export function Row({
  icon,
  color,
  title,
  subtitle,
  right,
  rightSub,
  chip,
  onPress,
  chevron,
}: {
  icon: IconName;
  color: string;
  title: string;
  subtitle?: string;
  right?: string;
  rightSub?: string;
  chip?: { label: string; tone?: Tone };
  onPress?: () => void;
  chevron?: boolean;
}) {
  return (
    <Card
      onPress={onPress}
      style={{ padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}
    >
      <IconCircle name={icon} color={color} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: font.bodyLg, fontWeight: "700", color: colors.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right || chip ? (
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {right ? <Text style={{ fontSize: font.bodyLg, fontWeight: "700", color: colors.text }}>{right}</Text> : null}
          {rightSub ? <Text style={{ fontSize: font.caption, color: colors.textMuted }}>{rightSub}</Text> : null}
          {chip ? <Chip label={chip.label} tone={chip.tone} /> : null}
        </View>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
    </Card>
  );
}

export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xl * 1.5, gap: spacing.sm }}>
      <Ionicons name={icon} size={44} color={colors.textMuted} />
      <Text style={{ fontSize: font.bodyLg, fontWeight: "600", color: colors.text }}>{title}</Text>
      {hint ? <Text style={{ fontSize: font.body, color: colors.textMuted, textAlign: "center" }}>{hint}</Text> : null}
    </View>
  );
}

// ---------- Inputs ----------
export function Field({
  label,
  error,
  hint,
  style,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const readOnly = props.editable === false;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: font.body, fontWeight: "600", color: colors.text }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            minHeight: 56,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            backgroundColor: readOnly ? colors.readonly : colors.surface,
            paddingHorizontal: spacing.lg,
            fontSize: font.bodyLg,
            color: colors.text,
          },
          style,
        ]}
      />
      {error ? (
        <Text style={{ fontSize: font.caption + 1, color: colors.danger }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontSize: font.caption + 1, color: colors.textMuted }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: "#E8EDF4", borderRadius: radius.md, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              {
                flex: 1,
                minHeight: 48,
                paddingVertical: 8,
                paddingHorizontal: 6,
                borderRadius: radius.md - 2,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: on ? colors.trackOn : "transparent",
              },
              on && shadow,
            ]}
          >
            <Text
              numberOfLines={2}
              style={{
                fontSize: 15,
                fontWeight: "700",
                textAlign: "center",
                color: on ? colors.text : colors.textMuted,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PanelRow = { label: string; value: string; strong?: boolean; tone?: "danger" };

// A white card with a colored accent bar: label/value rows and an optional note.
export function InfoPanel({
  icon,
  color,
  title,
  rows,
  note,
}: {
  icon: IconName;
  color: string;
  title: string;
  rows: PanelRow[];
  note?: { text: string; tone?: "danger" };
}) {
  return (
    <Card style={{ padding: 0, overflow: "hidden", flexDirection: "row" }}>
      <View style={{ width: 5, backgroundColor: color }} />
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <IconCircle name={icon} color={color} size={32} />
          <Text
            style={{
              fontSize: font.caption,
              fontWeight: "700",
              color: colors.textMuted,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {title}
          </Text>
        </View>
        {rows.map((r) => (
          <View
            key={r.label}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: r.strong ? font.bodyLg : font.body,
                fontWeight: r.strong ? "600" : "400",
                color: r.strong ? colors.text : colors.textMuted,
              }}
            >
              {r.label}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontSize: r.strong ? font.h1 : font.bodyLg,
                fontWeight: "700",
                color: r.tone === "danger" ? colors.danger : colors.text,
              }}
            >
              {r.value}
            </Text>
          </View>
        ))}
        {note ? (
          <Text style={{ fontSize: font.body, color: note.tone === "danger" ? colors.danger : colors.textMuted }}>
            {note.text}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
