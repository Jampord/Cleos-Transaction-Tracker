import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { Fragment, useEffect, useState } from "react";
import { ActivityIndicator, Text, useColorScheme, View } from "react-native";
import migrations from "../../drizzle/migrations";
import { db } from "../db/client";
import { getSetting } from "../db/queries";
import { seedIfEmpty } from "../db/seed";
import { applyMode, applyScheme, colors, ThemeMode } from "../ui/theme";

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [ready, setReady] = useState(false);

  // What the phone is showing now. It follows the Appearance choice.
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  applyScheme(scheme); // update the shared colors before anything below renders

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [scheme]);

  useEffect(() => {
    if (!success) return;
    (async () => {
      await seedIfEmpty();
      const saved = (await getSetting("theme_mode")) as ThemeMode | null;
      applyMode(saved ?? "light");
      setReady(true);
    })();
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 18, color: colors.danger }}>Database error: {error.message}</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
        // New key = the screens rebuild with the new colors. Navigation stays where it is.
        screenLayout={({ children, route }) =>
          route.name === "(tabs)" ? <>{children}</> : <Fragment key={scheme}>{children}</Fragment>
        }
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
