'use client';

/**
 * Admin Vendor Overview Map
 *
 * Read-only map showing all approved vendor branches.
 * Token: NEXT_PUBLIC_MAPBOX_TOKEN (public, scoped to map styles only).
 * Data: /api/admin/vendors/map-data (admin-only, requires auth).
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, Loader2, Store, RefreshCw } from 'lucide-react';
import { mapApi } from '@/lib/api';

const MAPBOX_STYLE   = 'mapbox://styles/mapbox/streets-v12';
const DEFAULT_CENTER: [number, number] = [3.3792, 6.5244]; // Lagos
const DEFAULT_ZOOM   = 10;

export default function VendorMapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const [mapReady, setMapReady]     = useState(false);
  const [popupInfo, setPopupInfo]   = useState<any>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-vendor-map'],
    queryFn: () => mapApi.getVendorMapData(),
  });

  const geojson = data?.data ?? { type: 'FeatureCollection', features: [], total: 0 };

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !token || mapRef.current) return;

    import('mapbox-gl').then((mod) => {
      const mapboxgl = mod.default;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: MAPBOX_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        setMapReady(true);

        // Add vendor branch source (populated after data loads)
        map.addSource('vendors', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 45,
        });

        // Cluster circles
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'vendors',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#c9a84c', 5, '#1a3c6e', 10, '#0f2547'],
            'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 10, 30],
            'circle-opacity': 0.85,
          },
        });

        // Cluster count labels
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'vendors',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 13,
          },
          paint: { 'text-color': '#ffffff' },
        });

        // Individual vendor pins
        map.addLayer({
          id: 'vendor-pin',
          type: 'circle',
          source: 'vendors',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#c9a84c',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        // Click on individual pin → show popup
        map.on('click', 'vendor-pin', (e: any) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          const [lng, lat] = e.features[0].geometry.coordinates;
          setPopupInfo({ ...props, lng, lat });
        });

        // Zoom into cluster on click
        map.on('click', 'clusters', (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] }) as any[];
          const clusterId = features[0]?.properties?.cluster_id;
          (map.getSource('vendors') as any).getClusterExpansionZoom(clusterId, (_: any, zoom: number) => {
            map.easeTo({ center: features[0].geometry.coordinates, zoom });
          });
        });

        map.on('mouseenter', 'vendor-pin', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'vendor-pin', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'clusters',   () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'clusters',   () => { map.getCanvas().style.cursor = ''; });
      });

      mapRef.current = map;
    });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Update GeoJSON when data arrives ────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geojson.features.length) return;
    const source = mapRef.current.getSource('vendors') as any;
    if (source) source.setData(geojson);
  }, [mapReady, geojson]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f2547] shadow-lg">
              <Map className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">Vendor Map</h1>
              <p className="text-sm text-[#7a8fa6]">
                {isLoading ? 'Loading…' : `${geojson.total ?? geojson.features.length} approved branch locations`}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(201,168,76,0.18)] text-sm font-medium text-slate-600 text-[rgba(245,240,232,0.7)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-1 relative">
        {/* Map */}
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {(isLoading || !token) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.05)]">
            {!token ? (
              <div className="text-center space-y-2">
                <Store className="h-10 w-10 text-[#7a8fa6] mx-auto" />
                <p className="text-[#7a8fa6] text-sm">
                  Set <code className="bg-slate-200 bg-[#1a3c6e] px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map.
                </p>
              </div>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
            )}
          </div>
        )}

        {/* Vendor info popup (positioned as overlay in corner for simplicity) */}
        {popupInfo && (
          <div className="absolute bottom-6 left-6 z-10 w-72 bg-[rgba(255,255,255,0.03)] rounded-2xl shadow-xl border border-[rgba(201,168,76,0.18)] p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-[#f5f0e8] text-sm">{popupInfo.vendorName}</h3>
              <button
                onClick={() => setPopupInfo(null)}
                className="text-[#7a8fa6] hover:text-[#f5f0e8] text-lg leading-none ml-2"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-[#7a8fa6] mb-1">{popupInfo.branchName}</p>
            <p className="text-xs text-[#7a8fa6] mb-3">{popupInfo.address}</p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium capitalize">
                {popupInfo.status}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-slate-600 text-[rgba(245,240,232,0.7)] text-xs capitalize">
                {popupInfo.tier}
              </span>
              {popupInfo.rating && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs">
                  ⭐ {Number(popupInfo.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
