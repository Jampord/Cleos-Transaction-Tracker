import { File, Paths } from "expo-file-system";
import { Stack, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import * as SQLite from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { sqlite } from "../db/client";
import { getExportData, getSetting, setSetting } from "../db/queries";
import { stamp } from "../lib/csv";
import { formatDateTime } from "../lib/dates";
import { buildExportCsv } from "../lib/export";
import { Button, Card, Chip, IconCircle, Screen } from "../ui/components";
import { colors, font, spacing } from "../ui/theme";

const today = () => stamp(Date.now()).slice(0, 10);

// Opens Android's file picker. Returns null if cancelled.
async function pickBackupFile(): Promise<File | null> {
  const res = await File.pickFileAsync();
  return res.canceled ? null : res.result;
}

export default function Backup() {
  const [last, setLast] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSetting("last_backup_at").then((v) => setLast(v ? Number(v) : null));
    }, []),
  );

  const stale = last === null || Date.now() - last > 7 * 24 * 60 * 60 * 1000;

  async function share(file: File, mimeType: string, title: string) {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing", "Sharing is not available on this phone.");
      return;
    }
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: title });
    const now = Date.now();
    await setSetting("last_backup_at", String(now));
    setLast(now);
  }

  async function backupDatabase() {
    let step = "starting";
    setBusy(true);
    try {
      step = "reading the database";
      const bytes = await sqlite.serializeAsync(); // a consistent copy of the whole database
      step = "creating the file";
      const file = new File(Paths.cache, `cleos-backup-${today()}.db`);
      if (file.exists) file.delete();
      file.create();
      step = "writing the file";
      await file.write(bytes);
      step = "opening the share sheet";
      await share(file, "application/octet-stream", "Send the backup to yourself");
    } catch (e) {
      Alert.alert("Backup failed", `While ${step}:\n${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportSpreadsheet() {
    setBusy(true);
    try {
      const csv = buildExportCsv(await getExportData());
      const file = new File(Paths.cache, `cleos-export-${today()}.csv`);
      if (file.exists) file.delete();
      file.create();
      await file.write(csv);
      await share(file, "text/csv", "Send the spreadsheet");
    } catch (e) {
      Alert.alert("Export failed", String(e));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    let step = "starting";
    setBusy(true);
    try {
      step = "choosing the file";
      const file = await pickBackupFile();
      if (!file) return; // cancelled

      step = "reading the file";
      const bytes = await file.bytes();

      step = "checking the file";
      // Every SQLite file starts with this text.
      const header = String.fromCharCode(...bytes.slice(0, 15));
      if (header !== "SQLite format 3") throw new Error("This is not a backup file from the app.");

      step = "opening the backup";
      const incoming = await SQLite.deserializeDatabaseAsync(bytes);

      step = "checking the tables";
      const tables = await incoming.getFirstAsync<{ n: number }>(
        "select count(*) as n from sqlite_master where name in ('transactions','water_sales','fee_tiers')",
      );
      if (!tables || tables.n < 3) {
        await incoming.closeAsync();
        throw new Error("This file is not a Cleo's Transaction Tracker backup.");
      }
      const counts = await incoming.getFirstAsync<{ n: number }>(
        "select (select count(*) from transactions) + (select count(*) from water_sales) as n",
      );

      const doRestore = async () => {
        let inner = "copying into the app";
        setBusy(true);
        try {
          await SQLite.backupDatabaseAsync({ sourceDatabase: incoming, destDatabase: sqlite });
          inner = "closing the backup";
          await incoming.closeAsync();
          Alert.alert("Restored", "Close the app completely, then open it again.");
        } catch (e) {
          Alert.alert("Restore failed", `While ${inner}:\n${String(e)}`);
        } finally {
          setBusy(false);
        }
      };

      Alert.alert(
        "Replace everything on this phone?",
        `The backup has ${counts?.n ?? 0} entries. All records currently on this phone will be replaced by it.`,
        [
          { text: "Cancel", style: "cancel", onPress: () => incoming.closeAsync() },
          {
            text: "Back up first",
            onPress: () => {
              incoming.closeAsync();
              backupDatabase();
            },
          },
          { text: "Replace everything", style: "destructive", onPress: doRestore },
        ],
      );
    } catch (e) {
      Alert.alert("Restore", `While ${step}:\n${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Backup and restore" }} />

      <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <IconCircle name="shield-checkmark-outline" color={stale ? colors.warning : colors.success} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: font.bodyLg, fontWeight: "700", color: colors.text }}>
            {last ? `Last backup: ${formatDateTime(last)}` : "No backup yet"}
          </Text>
          <Chip label={stale ? "Back up soon" : "Up to date"} tone={stale ? "warning" : "success"} />
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={{ fontSize: font.title, fontWeight: "700", color: colors.text }}>Back up everything</Text>
        <Text style={{ fontSize: font.body, color: colors.textMuted }}>
          Makes one file with all records. Send it to your email, Google Drive or Messenger. This is the file that can
          be restored.
        </Text>
        <Button
          label="Back up now"
          icon="cloud-upload-outline"
          variant="success"
          loading={busy}
          onPress={backupDatabase}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={{ fontSize: font.title, fontWeight: "700", color: colors.text }}>Spreadsheet</Text>
        <Text style={{ fontSize: font.body, color: colors.textMuted }}>
          A CSV that opens in Excel or Google Sheets. For reading and checking, not for restoring.
        </Text>
        <Button
          label="Export spreadsheet"
          icon="document-outline"
          variant="secondary"
          loading={busy}
          onPress={exportSpreadsheet}
        />
      </Card>

      <Card style={{ gap: spacing.md, borderColor: colors.dangerBg }}>
        <Text style={{ fontSize: font.body, fontWeight: "700", color: colors.textMuted }}>
          For whoever looks after the app
        </Text>
        <Text style={{ fontSize: font.body, color: colors.textMuted }}>
          Replaces all records on this phone with the ones in a backup file.
        </Text>
        <Button
          label="Restore from a backup file"
          icon="refresh-outline"
          variant="danger"
          loading={busy}
          onPress={restore}
        />
      </Card>
    </Screen>
  );
}
