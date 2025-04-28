// components/AuthButton.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loadingText?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  type = 'primary',
  icon,
  iconPosition = 'left',
  loadingText,
  style,
  textStyle,
  fullWidth = false,
  size = 'medium',
}: AuthButtonProps) {
  // Define button styles based on type
  const getButtonStyle = () => {
    const baseStyle = 'rounded-lg items-center justify-center flex-row';
    const sizeStyle =
      size === 'small'
        ? 'py-2 px-4'
        : size === 'large'
        ? 'py-4 px-8'
        : 'py-3 px-6';
    const widthStyle = fullWidth ? 'w-full' : '';

    switch (type) {
      case 'primary':
        return `${baseStyle} ${sizeStyle} ${widthStyle} bg-primary`;
      case 'secondary':
        return `${baseStyle} ${sizeStyle} ${widthStyle} bg-gray-100`;
      case 'outline':
        return `${baseStyle} ${sizeStyle} ${widthStyle} border border-primary`;
      case 'danger':
        return `${baseStyle} ${sizeStyle} ${widthStyle} bg-red-500`;
      default:
        return `${baseStyle} ${sizeStyle} ${widthStyle} bg-primary`;
    }
  };

  // Define text styles based on type
  const getTextStyle = () => {
    const baseStyle = 'font-semibold text-center';
    const sizeStyle =
      size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base';

    switch (type) {
      case 'primary':
        return `${baseStyle} ${sizeStyle} text-white`;
      case 'secondary':
        return `${baseStyle} ${sizeStyle} text-gray-800`;
      case 'outline':
        return `${baseStyle} ${sizeStyle} text-primary`;
      case 'danger':
        return `${baseStyle} ${sizeStyle} text-white`;
      default:
        return `${baseStyle} ${sizeStyle} text-white`;
    }
  };

  // Get loader color based on button type
  const getLoaderColor = () => {
    switch (type) {
      case 'primary':
      case 'danger':
        return 'white';
      case 'secondary':
        return '#5E72E4';
      case 'outline':
        return '#5E72E4';
      default:
        return 'white';
    }
  };

  // Determine the appropriate opacity for the button based on state
  const getOpacityStyle = () => {
    if (disabled || loading) {
      return 'opacity-70';
    }
    return '';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${getButtonStyle()} ${getOpacityStyle()}`}
      style={style}
    >
      {loading ? (
        <>
          <ActivityIndicator color={getLoaderColor()} size="small" />
          {loadingText && (
            <Text className={`${getTextStyle()} ml-2`}>{loadingText}</Text>
          )}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View className="mr-2">{icon}</View>
          )}
          <Text className={getTextStyle()} style={textStyle}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View className="ml-2">{icon}</View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

// Predefined social auth buttons
export const GoogleAuthButton = ({
  onPress,
  loading,
  disabled,
  title = 'Continue with Google',
  loadingText = 'Signing in...',
  ...rest
}: Partial<AuthButtonProps>) => {
  const googleIcon = (
    <Image
      source={{
        uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg',
      }}
      className="w-5 h-5"
    />
  );

  return (
    <AuthButton
      title={title}
      onPress={onPress || (() => {})}
      loading={loading}
      disabled={disabled}
      type="secondary"
      icon={googleIcon}
      loadingText={loadingText}
      {...rest}
    />
  );
};

export const SignOutButton = ({
  onPress,
  loading,
  title = 'Sign Out',
  ...rest
}: Partial<AuthButtonProps>) => {
  const logoutIcon = (
    <Ionicons name="log-out-outline" size={20} color="white" />
  );

  return (
    <AuthButton
      title={title}
      onPress={onPress || (() => {})}
      loading={loading}
      type="danger"
      icon={logoutIcon}
      {...rest}
    />
  );
};
