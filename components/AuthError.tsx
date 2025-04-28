// components/AuthError.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthErrorProps {
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  hideAfter?: number; // in milliseconds
}

export default function AuthError({
  message,
  onDismiss,
  autoHide = true,
  hideAfter = 5000,
}: AuthErrorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const opacity = new Animated.Value(0);

  // Handle fade in/out animation
  useEffect(() => {
    if (isVisible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide the error message after specified time
      if (autoHide) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, hideAfter);

        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={{ opacity }}
      className="mx-4 mb-4 bg-red-100 border-l-4 border-red-500 rounded-md p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text className="ml-2 text-red-700 font-medium">{message}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss}>
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
