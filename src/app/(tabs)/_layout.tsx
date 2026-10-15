import { Ionicons } from "@expo/vector-icons";
import { Tabs, router, usePathname } from "expo-router";
import { useRef } from "react";
import { ColorValue, Pressable, View, useColorScheme } from "react-native";
import { setSetting } from "../../db/queries";
import { IconName, applyMode, applyScheme, colors } from "../../ui/theme";

const tab =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color as string} />
  );

// URL of each tab -> its name, so we know which tab she is on.
const TAB_FOR_PATH: Record<string, string> = {
  "/": "index",
  "/utang": "utang",
  "/water": "water",
  "/cash-check": "cash-check",
};

// Moon/sun toggle and the settings gear, top right of every tab.
function HeaderButtons() {
  const dark = useColorScheme() === "dark";

  const toggle = async () => {
    const next = dark ? "light" : "dark";
    await setSetting("theme_mode", next);
    applyMode(next);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginRight: 16 }}>
      <Pressable
        onPress={toggle}
        hitSlop={12}
        accessibilityLabel={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Ionicons name={dark ? "sunny-outline" : "moon-outline"} size={26} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => router.push("/settings")} hitSlop={12} accessibilityLabel="Settings">
        <Ionicons name="settings-outline" size={26} color={colors.text} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  applyScheme(scheme); // make sure the shared colors are current before building the bars

  // Remember the current tab, so rebuilding the bars for a new mode keeps her on it.
  const pathname = usePathname();
  const lastTab = useRef("index");
  if (TAB_FOR_PATH[pathname]) lastTab.current = TAB_FOR_PATH[pathname];

  return (
    <Tabs
      key={scheme} // a new mode rebuilds the header and tab bar with the new colors
      initialRouteName={lastTab.current}
      screenOptions={{
        animation: "none",
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 18, color: colors.text },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        tabBarStyle: {
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.bg },
        headerRight: () => <HeaderButtons />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Today", headerTitle: "Cleo's Transaction Tracker", tabBarIcon: tab("home") }}
      />
      <Tabs.Screen name="utang" options={{ title: "Utang", tabBarIcon: tab("people") }} />
      <Tabs.Screen name="water" options={{ title: "Water", tabBarIcon: tab("water") }} />
      <Tabs.Screen name="cash-check" options={{ title: "Cash check", tabBarIcon: tab("calculator") }} />
    </Tabs>
  );
}
