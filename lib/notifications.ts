import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { API_BASE } from '../constants/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(userId: string, role: 'owner' | 'cast') {
  if (!Device.isDevice) return;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'ef432d11-9794-4de8-ad5b-095cac6076aa',
    })).data;

    await fetch(`${API_BASE}/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        ...(role === 'owner' ? { shop_owner_id: userId } : { cast_account_id: userId }),
      }),
    });
  } catch (e) {
    console.log('Push token registration failed:', e);
  }
}

// 通知タップ時の遷移処理
function handleNotificationNavigation(data: any) {
  if (!data?.type) return;
  switch (data.type) {
    case 'shift_request':
    case 'shift_confirmed':
      router.push('/(tabs)/shift');
      break;
    case 'shift_rejected':
      router.push('/(tabs)/shift');
      break;
    default:
      router.push('/(tabs)');
  }
}

// アプリ起動中の通知タップ
export function setupNotificationListeners() {
  // 通知タップで開いた場合
  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    handleNotificationNavigation(response.notification.request.content.data);
  });

  // 起動時：アプリが終了状態から通知タップで起動された場合
  Notifications.getLastNotificationResponseAsync().then(response => {
    if (response) handleNotificationNavigation(response.notification.request.content.data);
  });

  return () => responseSub.remove();
}
