"use client"; // Mark as a client component

import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/contexts/AuthProvider';
import { router } from 'expo-router';

const Index = () => {
  const { user, loading } = useAuth();
  console.log('[Index] Component rendering...', { loading, user: user ? 'Exists' : 'Null' }); // Log render

  useEffect(() => {
    console.log(`[Index] useEffect running. Loading: ${loading}, User: ${user ? 'Exists' : 'Null'}`); // Log effect run

    if (!loading) {
      console.log('[Index] Auth state loaded.'); // Log condition met
      if (user) {
        console.log('[Index] User found. Replacing route with /(tabs)');
        router.replace('/(tabs)');
      } else {
        console.log('[Index] User NOT found. Replacing route with /(auth)/login');
        router.replace('/(auth)/login');
      }
    } else {
      console.log('[Index] Auth state still loading...'); // Log condition not met
    }
  }, [loading, user]);

  // Show loading indicator while determining auth state or redirecting
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
};

export default Index;
