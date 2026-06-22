/**
 * VendorMapView — Map for the discovery screen.
 *
 * Rendering strategy:
 *   1. Native dev/production build  → @rnmapbox/maps  (full Mapbox, clustering)
 *   2. Expo Go (or no Mapbox token) → react-native-maps  (Apple Maps on iOS,
 *                                      Google Maps on Android — works in Expo Go)
 *
 * Geocoding is NEVER called from this component. Coordinates come from the API.
 * The public Mapbox token (EXPO_PUBLIC_MAPBOX_TOKEN) is used only for map styles.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Navigation } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { config } from '../lib/config';

const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';
const MAPBOX_STYLE_DARK  = 'mapbox://styles/mapbox/dark-v11';

// Lagos default centre
const DEFAULT_LAT = 6.5244;
const DEFAULT_LNG = 3.3792;
const DEFAULT_DELTA = 0.15; // ~15 km radius in degrees

export interface VendorPin {
  id: string;
  slug: string;
  businessName: string;
  averageRating?: number | null;
  lat: number;
  lng: number;
}

interface Props {
  vendors: VendorPin[];
  userLocation?: { latitude: number; longitude: number } | null;
  loading?: boolean;
  onRequestLocation?: () => void;
}

// ── Detect which map SDK is available at runtime ──────────────────────────
let MapboxSDK: any = null;
try {
  MapboxSDK = require('@rnmapbox/maps');
  if (config.mapboxPublicToken) {
    MapboxSDK.default?.setAccessToken(config.mapboxPublicToken);
  }
} catch {
  MapboxSDK = null;
}

const useMapbox = !!MapboxSDK && !!config.mapboxPublicToken;

// ── react-native-maps — available in Expo Go ──────────────────────────────
let RNMapView: any = null;
let RNMarker: any  = null;
let RNCallout: any = null;
try {
  const rn = require('react-native-maps');
  RNMapView  = rn.default;
  RNMarker   = rn.Marker;
  RNCallout  = rn.Callout;
} catch {
  /* react-native-maps not installed */
}

// ── Component ─────────────────────────────────────────────────────────────
export default function VendorMapView({ vendors, userLocation, loading, onRequestLocation }: Props) {
  const router = useRouter();
  const { colors, isDark } = useTheme() as any;
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  const centerLat = userLocation?.latitude  ?? DEFAULT_LAT;
  const centerLng = userLocation?.longitude ?? DEFAULT_LNG;

  const onPinPress = useCallback((slug: string) => {
    router.push(`/venue/${slug}`);
  }, [router]);

  // ── Mapbox (native dev build) ────────────────────────────────────────
  if (useMapbox) {
    const {
      MapView, Camera, ShapeSource,
      CircleLayer, SymbolLayer, UserLocation: MapUserLocation,
    } = MapboxSDK.default ?? MapboxSDK;

    const geojson = {
      type: 'FeatureCollection' as const,
      features: vendors.map((v) => ({
        type: 'Feature' as const,
        id: v.id,
        geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
        properties: { id: v.id, slug: v.slug, name: v.businessName, rating: v.averageRating ?? 0 },
      })),
    };

    return (
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          styleURL={isDark ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled
        >
          <Camera
            centerCoordinate={[centerLng, centerLat]}
            zoomLevel={11}
            animationMode="flyTo"
            animationDuration={600}
          />
          <MapUserLocation visible={!!userLocation} showsUserHeadingIndicator />
          <ShapeSource
            id="vendors"
            cluster
            clusterMaxZoomLevel={14}
            clusterRadius={50}
            shape={geojson}
            onPress={(e: any) => {
              const f = e.features?.[0];
              if (!f || f?.properties?.cluster) return;
              if (f?.properties?.slug) onPinPress(f.properties.slug);
            }}
          >
            <CircleLayer
              id="clusters"
              belowLayerID="cluster-count"
              filter={['has', 'point_count']}
              style={{
                circleColor: colors.primary,
                circleRadius: ['step', ['get', 'point_count'], 18, 5, 24, 10, 30],
                circleOpacity: 0.9,
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
            <SymbolLayer
              id="cluster-count"
              filter={['has', 'point_count']}
              style={{
                textField: '{point_count_abbreviated}',
                textSize: 13,
                textColor: '#ffffff',
                textFont: ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              }}
            />
            <CircleLayer
              id="pins"
              filter={['!', ['has', 'point_count']]}
              style={{
                circleColor: colors.primary,
                circleRadius: 9,
                circleStrokeWidth: 2.5,
                circleStrokeColor: '#ffffff',
              }}
            />
          </ShapeSource>
        </MapView>
        <NearMeButton colors={colors} onPress={onRequestLocation} />
        {loading && <LoadingOverlay colors={colors} />}
      </View>
    );
  }

  // ── react-native-maps fallback (Expo Go / no Mapbox token) ───────────
  if (RNMapView) {
    return (
      <View style={styles.container}>
        <RNMapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: DEFAULT_DELTA,
            longitudeDelta: DEFAULT_DELTA,
          }}
          region={userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: DEFAULT_DELTA,
            longitudeDelta: DEFAULT_DELTA,
          } : undefined}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
        >
          {vendors.map((v) => (
            <RNMarker
              key={v.id}
              coordinate={{ latitude: v.lat, longitude: v.lng }}
              pinColor={colors.primary}
              onPress={() => {
                setSelectedPin(v.id === selectedPin ? null : v.id);
              }}
            >
              {RNCallout && (
                <RNCallout onPress={() => onPinPress(v.slug)} tooltip={false}>
                  <View style={[styles.callout, { backgroundColor: colors.card }]}>
                    <Text style={[styles.calloutTitle, { color: colors.text }]} numberOfLines={1}>
                      {v.businessName}
                    </Text>
                    {v.averageRating != null && (
                      <Text style={[styles.calloutRating, { color: colors.textSecondary }]}>
                        ⭐ {v.averageRating.toFixed(1)}
                      </Text>
                    )}
                    <Text style={[styles.calloutCta, { color: colors.primary }]}>
                      Tap to view →
                    </Text>
                  </View>
                </RNCallout>
              )}
            </RNMarker>
          ))}
        </RNMapView>
        <NearMeButton colors={colors} onPress={onRequestLocation} />
        {loading && <LoadingOverlay colors={colors} />}
      </View>
    );
  }

  // ── Last resort: no map SDK at all ───────────────────────────────────
  return (
    <View style={[styles.noMap, { backgroundColor: colors.card }]}>
      <Text style={[styles.noMapText, { color: colors.textSecondary }]}>
        Map not available — install react-native-maps or build with Expo dev client.
      </Text>
    </View>
  );
}

// ── Small shared sub-components ──────────────────────────────────────────
function NearMeButton({ colors, onPress }: { colors: any; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.locationBtn, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Navigation size={20} color={colors.primary} />
    </TouchableOpacity>
  );
}

function LoadingOverlay({ colors }: { colors: any }) {
  return (
    <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
      <ActivityIndicator color={colors.primary} size="small" />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  locationBtn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: {
    width: 180,
    padding: 10,
    borderRadius: 10,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutRating: {
    fontSize: 12,
    marginBottom: 4,
  },
  calloutCta: {
    fontSize: 12,
    fontWeight: '500',
  },
  noMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noMapText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
