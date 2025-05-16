import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { resetDatabase } from '../../lib/database/database';

/**
 * DatabaseResetHelper component - renders a button that forcibly deletes and recreates the database.
 * This can help recover from migration issues that can't be solved with regular migration logic.
 * 
 * CAUTION: This will delete all local data. Use only when necessary!
 */
const DatabaseResetHelper = () => {  const handleReset = async () => {
    try {
      const result = await resetDatabase();
      if (result) {
        // Database was reset successfully
        Alert.alert(
          "Reset Successful",
          "Database reset successfully. The app will now reload. Your local data has been deleted."
        );
        // On web you might want to reload the page
        // On native, you'd typically want to show an alert then let the user restart manually
      } else {
        Alert.alert(
          "Reset Not Needed",
          "Database reset not needed or couldn't be completed."
        );
      }
    } catch (error) {
      console.error("Error resetting database:", error);
      Alert.alert(
        "Reset Failed",
        `Error resetting database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleResetGuidance = () => {
    Alert.alert( // Changed from alert() to Alert.alert()
      "Database Reset Steps",
      "To reset the database, please follow these steps:\n1. Ensure the app is completely closed (swipe away from recent apps).\n2. Uninstall the app from your device/emulator.\n3. Reinstall the app using 'npx expo run:android' or 'npx expo run:ios'.\n4. The database will be recreated on the next app launch.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.warningText}>⚠️ DATABASE TROUBLESHOOTING ⚠️</Text>
      <Text style={styles.descriptionText}>
        If you're experiencing database errors about missing columns, use this button to reset your local database.
        WARNING: This will delete all local data that hasn't been synced!
      </Text>
      <Button
        title="Reset Local Database"
        onPress={handleReset}
        color="#ff3b30"
      />
      <Button
        title="Reset Guidance"
        onPress={handleResetGuidance}
        color="#007bff"
      />
      <Text style={styles.noteText}>
        After reset, close and restart the app completely for changes to take effect.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#ffeeba',
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    marginBottom: 16,
    fontSize: 14,
    color: '#856404',
  },
  noteText: {
    marginTop: 16,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#856404',
  },
});

export default DatabaseResetHelper;
