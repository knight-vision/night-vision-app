import { Platform } from 'react-native';
import { API_BASE } from '../constants/api';

export async function registerPushToken(userId: string, role: 'owner' | 'cast') {
  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if (!Device.default.isDevice) return;

    Notifications.default.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existingStatus } = await Notifications.default.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.default.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const token = (await Notifications.default.getExpoPushTokenAsync({
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
    console.log('Push notification setup failed:', e);
  }
}
