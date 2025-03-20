import React from 'react';
import { Redirect } from 'expo-router';

const Index = () => {
  // Redirect to the main app or to the auth flow depending on authentication status
  // This will be updated later to check auth state
  return <Redirect href="/(tabs)" />;
};

export default Index;
