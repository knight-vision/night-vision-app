import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp, GestureResponderEvent, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'select' | 'none';
  scaleTo?: number;       // どこまで縮むか（小さいほどぷにっと感大）
  springConfig?: { tension?: number; friction?: number };
  hitSlop?: number;
};

const hapticMap = {
  light:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:  () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  select:  () => Haptics.selectionAsync(),
  none:    () => Promise.resolve(),
};

/**
 * ぷにぷにボタン
 * - 押下: スプリングで0.94倍に縮む
 * - 離す: 跳ねながら元に戻る
 * - 触覚フィードバック付き
 */
export function PunyTouchable({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  haptic = 'light',
  scaleTo = 0.94,
  springConfig,
  hitSlop = 8,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 12,
      ...springConfig,
    }).start();
    hapticMap[haptic]?.().catch(() => {});
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 18, // よく跳ねる
      ...springConfig,
    }).start();
  };

  // styleからレイアウト系プロパティを抽出してPressableに渡す（flex等を効かせるため）
  const flat = StyleSheet.flatten(style) || {};
  const pressableStyle: ViewStyle = {};
  const layoutKeys = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'alignSelf', 'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'marginHorizontal', 'marginVertical'];
  layoutKeys.forEach(k => {
    if ((flat as any)[k] !== undefined) (pressableStyle as any)[k] = (flat as any)[k];
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={pressableStyle}>
      <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? 0.5 : 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// シンプルな触覚だけ実行するヘルパー
export const haptic = hapticMap;
