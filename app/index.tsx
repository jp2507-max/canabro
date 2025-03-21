import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/contexts/AuthProvider';

const Index = () => {
  const { user, loading } = useAuth();
  const [initializing, setInitializing] = useState(true);

  // Wait for auth state to be determined before redirecting
  useEffect(() => {
    if (!loading) {
      // Add a small delay to ensure auth state is fully loaded
      const timer = setTimeout(() => {
        setInitializing(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading indicator while determining auth state
  if (loading || initializing) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // Redirect based on authentication status
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
};

export default Index;
