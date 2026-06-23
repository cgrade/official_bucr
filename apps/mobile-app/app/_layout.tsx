import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from '../src/providers/AuthProvider';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import {
  registerForPushNotifications,
  savePushTokenToBackend,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  NotificationData,
} from '../src/lib/notifications';

SplashScreen.preventAutoHideAsync();

// Crash + error reporting. No-op without a DSN (so dev/local builds are unaffected);
// disabled in __DEV__ so only real builds report. Set EXPO_PUBLIC_SENTRY_DSN to enable.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        1000 * 60 * 5,   // 5 min — cached data treated as fresh
      gcTime:           1000 * 60 * 30,  // 30 min — keep in memory after unmount
      retry:            2,
      retryDelay:       (attempt) => Math.min(1000 * 2 ** attempt, 10000), // exp back-off
      refetchOnWindowFocus: false,        // don't refetch on app foreground in React Native
      networkMode:      'online',
    },
    mutations: {
      retry:    1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    SplashScreen.hideAsync();

    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        savePushTokenToBackend(token);
      }
    });

    // Handle notifications received while app is in foreground
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification taps
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      
      // Navigate based on notification type
      if (data?.type === 'reservation_confirmed' || data?.type === 'reservation_reminder') {
        if (data.reservationId) {
          router.push(`/booking/${data.reservationId}`);
        }
      } else if (data?.type === 'credits_purchased' || data?.type === 'credits_expiring') {
        router.push('/(tabs)/wallet');
      } else if (data?.vendorSlug) {
        router.push(`/venue/${data.vendorSlug}`);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
                <Stack.Screen name="venue/[slug]" options={{ presentation: 'card' }} />
                <Stack.Screen name="venue/[slug]/book" options={{ presentation: 'modal' }} />
                <Stack.Screen name="booking/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen name="booking/[id]/qr" options={{ presentation: 'modal' }} />
                <Stack.Screen name="wallet/buy"     options={{ presentation: 'modal' }} />
                <Stack.Screen name="wallet/gift"    options={{ presentation: 'modal' }} />
                <Stack.Screen name="wallet/history" options={{ presentation: 'card' }}  />
                <Stack.Screen name="order/[id]" options={{ presentation: 'card' }} />
                {/* settings/index.tsx is the settings hub — must use "settings/index", not "settings" */}
                <Stack.Screen name="settings/index"         options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/edit-profile"  options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/favorites"     options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/reviews"       options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/referral"      options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/notifications" options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/help"          options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/orders"        options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/privacy"       options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/privacy-policy" options={{ presentation: 'card' }} />
                <Stack.Screen name="settings/terms"         options={{ presentation: 'card' }} />
              </Stack>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap adds error-boundary + perf instrumentation; passes through safely
// even when Sentry isn't initialised (no DSN).
export default Sentry.wrap(RootLayout);
