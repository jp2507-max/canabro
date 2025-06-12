'use client'; // Mark as a client component

import { Redirect } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../lib/contexts/AuthProvider';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // Once loading is complete, immediately redirect based on auth state.
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
};

export default Index;
