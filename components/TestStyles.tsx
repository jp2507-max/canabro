"use client";

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const TestNativeWind = () => {
  return (
    <View className="p-4 m-4 bg-green-500 rounded-lg">
      <Text className="text-white font-bold text-lg">NativeWind Test</Text>
    </View>
  );
};

export const TestStyleSheet = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>StyleSheet Test</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    backgroundColor: 'blue',
    borderRadius: 8,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
