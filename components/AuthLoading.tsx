// components/AuthLoading.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthLoadingProps {
  message?: string;
}

export default function AuthLoading({
  message = 'Authenticating...',
}: AuthLoadingProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create a continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Map rotation value to degrees
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <View className="items-center">
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="refresh-circle-outline" size={60} color="#5E72E4" />
        </Animated.View>
        <Text className="mt-4 text-gray-700 text-center font-medium text-base">
          {message}
        </Text>
      </View>
    </View>
  );
}
