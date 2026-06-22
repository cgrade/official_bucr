import * as Haptics from 'expo-haptics';

/**
 * Light haptic feedback for button presses and selections
 */
export async function lightHaptic(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Medium haptic feedback for confirmations
 */
export async function mediumHaptic(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Heavy haptic feedback for important actions
 */
export async function heavyHaptic(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Success notification haptic
 */
export async function successHaptic(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Warning notification haptic
 */
export async function warningHaptic(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Error notification haptic
 */
export async function errorHaptic(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Selection changed haptic (for switches, toggles, pickers)
 */
export async function selectionHaptic(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics not available on this device
  }
}
