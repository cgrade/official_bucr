import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from './api';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Expo Push requires a real EAS project UUID (from expo.dev / `eas project:info`). */
function resolveExpoProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_PROJECT_ID?.trim();
  if (fromEnv && UUID_RE.test(fromEnv)) return fromEnv;

  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
    ?.projectId?.trim();
  if (fromConfig && UUID_RE.test(fromConfig)) return fromConfig;

  return undefined;
}

const PUSH_TOKEN_KEY = 'push_token';

// Configure notification behavior — only in real device builds.
// Expo Go (SDK 53+) removed remote push support; setting the handler there
// triggers the console warnings we want to suppress.
if (Constants.executionEnvironment !== 'storeClient') {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      } as Notifications.NotificationBehavior),
  });
}

/**
 * Returns true when running inside Expo Go (not a development or production build).
 * Expo Go removed remote push-notification support in SDK 53.
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Request notification permissions and get push token.
 * Silently returns null in Expo Go (remote push is not supported there since SDK 53).
 * Also returns null if no valid EAS projectId is configured — no error logged.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Skip silently in Expo Go — remote push requires a dev/production build
  if (isExpoGo()) {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  // Without a valid project UUID we cannot fetch an Expo push token
  const projectId = resolveExpoProjectId();
  if (!projectId) {
    // Not an error — just not configured yet. Local notifications still work.
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#efc07b',
      });
      await Notifications.setNotificationChannelAsync('reservations', {
        name: 'Reservations',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
      await Notifications.setNotificationChannelAsync('credits', {
        name: 'Credits',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#efc07b',
      });
    }

    return token;
  } catch (error) {
    // Log as warning only — push tokens are non-critical for app functionality
    console.warn('[notifications] Could not get push token:', error);
    return null;
  }
}

/**
 * Save push token to backend
 */
export async function savePushTokenToBackend(token: string): Promise<boolean> {
  try {
    await authApi.updatePushToken(token);
    return true;
  } catch (error) {
    console.error('Error saving push token to backend:', error);
    return false;
  }
}

/**
 * Get stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear push token (on logout)
 */
export async function clearPushToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing push token:', error);
  }
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// Notification types for the app
export type NotificationType = 
  | 'reservation_confirmed'
  | 'reservation_reminder'
  | 'reservation_cancelled'
  | 'credits_purchased'
  | 'credits_expiring'
  | 'credits_refunded'
  | 'review_reminder'
  | 'promo';

export interface NotificationData {
  type: NotificationType;
  reservationId?: string;
  vendorSlug?: string;
  amount?: number;
  [key: string]: unknown;
}
