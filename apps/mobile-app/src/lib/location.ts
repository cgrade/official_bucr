import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

let cachedLocation: UserLocation | null = null;

export async function getCurrentLocation(): Promise<UserLocation | null> {
  if (cachedLocation) return cachedLocation;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    // kCLErrorDomain error 0 = location temporarily unavailable on iOS Simulator / Expo Go.
    // Use getLastKnownPositionAsync as a fast fallback before trying getCurrentPositionAsync.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    if (last) {
      cachedLocation = { latitude: last.coords.latitude, longitude: last.coords.longitude };
      return cachedLocation;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low, // Low = faster, fewer hardware failures
      timeInterval: 5000,
    });

    cachedLocation = { latitude: location.coords.latitude, longitude: location.coords.longitude };
    return cachedLocation;
  } catch {
    // Location unavailable (simulator, Expo Go, permissions) — non-fatal, distance sorting skipped
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function clearLocationCache(): void {
  cachedLocation = null;
}

export async function getLocationWithCity(): Promise<{ location: UserLocation; city: string } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    // Try to get city name via reverse geocoding
    try {
      const [address] = await Location.reverseGeocodeAsync(coords);
      const city = address?.city || address?.subregion || address?.region || 'Unknown';
      const country = address?.country || 'Nigeria';
      
      cachedLocation = coords;
      
      return {
        location: coords,
        city: `${city}, ${country}`,
      };
    } catch (geocodeError) {
      console.log('Geocoding failed, using coordinates only');
      cachedLocation = coords;
      return {
        location: coords,
        city: 'Lagos, Nigeria', // Default fallback
      };
    }
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}
