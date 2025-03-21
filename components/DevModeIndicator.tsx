import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { isDevelopment, authConfig } from '../lib/config';
import { useAuth } from '../lib/contexts/AuthProvider';

interface DevModeIndicatorProps {
  showFullDetails?: boolean;
}

/**
 * A component that displays a development mode indicator
 * Only visible in development mode
 */
export function DevModeIndicator({ showFullDetails = false }: DevModeIndicatorProps) {
  const { devBypassAuth, user } = useAuth();
  
  // Don't show anything in production mode
  if (!isDevelopment) {
    return null;
  }
  
  // Minimal version for normal screens
  if (!showFullDetails) {
    return (
      <View style={styles.miniContainer}>
        <Text style={styles.miniText}>DEV MODE</Text>
      </View>
    );
  }
  
  // Full version with auth details
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Development Mode</Text>
      <Text style={styles.detail}>Auth: {authConfig.forceDevBypass ? 'Auto Bypass' : 'Manual'}</Text>
      <Text style={styles.detail}>Mock DB: {authConfig.useMockAdapter ? 'Enabled' : 'Disabled'}</Text>
      <Text style={styles.detail}>User ID: {user?.id || 'Not logged in'}</Text>
      
      {!authConfig.forceDevBypass && (
        <TouchableOpacity 
          style={styles.button}
          onPress={() => devBypassAuth()}
        >
          <Text style={styles.buttonText}>Use Dev Auth</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'rgba(255, 200, 0, 0.2)',
    borderRadius: 6,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    marginBottom: 2,
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 200, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
    zIndex: 999,
  },
  miniText: {
    fontSize: 10,
    fontWeight: 'bold',
  }
});
