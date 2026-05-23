// Push notifications disabled for preview build
// Will be enabled in production build

export async function registerPushToken(_userId: string, _role: 'owner' | 'cast') {
  // Disabled in preview - enable in production with expo-notifications
  console.log('Push notifications not enabled in preview build');
}
