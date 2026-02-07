"use client";

import { cn } from "@/lib/utils";
import {
  createElementObject,
  createLayerComponent,
  type LayerProps,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import { useTambo } from "@tambo-ai/react";
import { cva, type VariantProps } from "class-variance-authority";
import L, {
  type HeatLatLngTuple,
  type MarkerClusterGroupOptions,
} from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import * as React from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import { z } from "zod";

/**
 * Props interface for MarkerClusterGroup component
 * @interface MarkerClusterGroupProps
 * @extends {MarkerClusterGroupOptions}
 */
interface MarkerClusterGroupProps extends MarkerClusterGroupOptions, LayerProps {
  /** React children elements to be rendered within the cluster group */
  children?: React.ReactNode;
  /** Optional function to create custom cluster icons */
  iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon;
}

/**
 * Component to group markers into clusters
 * Uses leaflet.markercluster under the hood
 */
const ClusterGroup = createLayerComponent<
  L.MarkerClusterGroup,
  MarkerClusterGroupProps
>(
  function createMarkerClusterGroup(
    { children: _c, ...options },
    ctx: LeafletContextInterface,
  ) {
    const clusterProps: MarkerClusterGroupOptions = {
      ...options,
      // Default icon creator if none provided
      iconCreateFunction:
        options.iconCreateFunction ||
        ((cluster: L.MarkerCluster) => {
          const count = cluster.getChildCount();
          let size = "small";
          if (count > 10) size = "medium";
          if (count > 50) size = "large";

          return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: `marker-cluster marker-cluster-${size}`,
            iconSize: L.point(40, 40),
          });
        }),
    };

    const clusterGroup = new L.MarkerClusterGroup(clusterProps);
    return createElementObject(clusterGroup, ctx);
  },
  function updateMarkerClusterGroup(
    layer: L.MarkerClusterGroup,
    props: MarkerClusterGroupProps,
    prevProps: MarkerClusterGroupProps,
  ) {
    // We only need to update if options changed significantly
    // Most updates happen via children changes which React handles
  },
);

/**
 * Props for the HeatmapLayer component
 */
interface HeatmapLayerProps extends LayerProps {
  /** Array of points [lat, lng, intensity] */
  points: HeatLatLngTuple[];
  /** Optional configuration for heatmap appearance */
  options?: {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [key: number]: string };
  };
}

/**
 * Component to render a heatmap layer
 * Uses leaflet.heat under the hood
 */
const HeatmapLayer = createLayerComponent<L.HeatLayer, HeatmapLayerProps>(
  function createHeatmapLayer(
    { points, options },
    ctx: LeafletContextInterface,
  ) {
    const layer = L.heatLayer(points, options);
    return createElementObject(layer, ctx);
  },
  function updateHeatmapLayer(
    layer: L.HeatLayer,
    props: HeatmapLayerProps,
    prevProps: HeatmapLayerProps,
  ) {
    if (props.points !== prevProps.points) {
      layer.setLatLngs(props.points);
    }
    if (props.options !== prevProps.options) {
      layer.setOptions(props.options || {});
    }
  },
);

/**
 * Zod schema for map marker data
 */
export const MapMarkerSchema = z.object({
  id: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  label: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export type MapMarker = z.infer<typeof MapMarkerSchema>;

/**
 * Props for the Map component
 */
export interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Center coordinates [lat, lng] */
  center?: [number, number];
  /** Zoom level (1-18) */
  zoom?: number;
  /** Array of markers to display */
  markers?: MapMarker[];
  /** Theme for map tiles */
  tileTheme?: "default" | "dark" | "light" | "satellite";
  /** Theme for container styling */
  theme?: "default" | "sage";
  /** Whether to show heatmap instead of markers */
  showHeatmap?: boolean;
  /** Points for heatmap if enabled */
  heatmapPoints?: HeatLatLngTuple[];
  /** Callback when map is clicked */
  onMapClick?: (lat: number, lng: number) => void;
  /** Callback when a marker is clicked */
  onMarkerClick?: (marker: MapMarker) => void;
  /** Whether to auto-fit bounds to include all markers */
  fitBounds?: boolean;
  /** Whether to show zoom controls */
  zoomControl?: boolean;
}

/**
 * Helper to handle map clicks
 */
function MapClickHandler({
  onClick,
}: {
  onClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Component to update map view when props change
 */
function MapUpdater({
  center,
  zoom,
  markers,
  fitBounds,
}: {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  fitBounds?: boolean;
}) {
  const map = useMapEvents({});

  React.useEffect(() => {
    if (fitBounds && markers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, markers, fitBounds, map]);

  return null;
}

const mapVariants = cva("w-full h-full rounded-md overflow-hidden relative", {
  variants: {
    theme: {
      default: "border border-border",
      sage: "border-none shadow-sm",
    },
  },
  defaultVariants: {
    theme: "default",
  },
});

/**
 * Interactive map component
 * Supports markers, clustering, heatmaps, and different tile themes
 */
export const Map = React.forwardRef<HTMLDivElement, MapProps>(
  (
    {
      className,
      center = [51.505, -0.09], // London default
      zoom = 13,
      markers = [],
      tileTheme,
      theme = "default",
      showHeatmap = false,
      heatmapPoints = [],
      onMapClick,
      onMarkerClick,
      fitBounds = true,
      zoomControl = true,
      ...props
    },
    ref,
  ) => {
    // Fix for Leaflet marker icons in Next.js
    React.useEffect(() => {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
    }, []);

    const { thread } = useTambo();

    const effectiveTileTheme = tileTheme ?? theme ?? "default";

    // Filter valid markers
    const validMarkers = markers.filter(
      (m) =>
        typeof m.lat === "number" &&
        typeof m.lng === "number" &&
        !isNaN(m.lat) &&
        !isNaN(m.lng),
    );

    return (
      <div
        ref={ref}
        className={cn(mapVariants({ theme }), className)}
        {...props}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          zoomControl={zoomControl}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={getTileLayerUrl(
              effectiveTileTheme as
                | "default"
                | "dark"
                | "light"
                | "satellite",
            )}
          />

          <MapUpdater
            center={center}
            zoom={zoom}
            markers={validMarkers}
            fitBounds={fitBounds}
          />

          {showHeatmap && heatmapPoints.length > 0 ? (
            <HeatmapLayer points={heatmapPoints} />
          ) : (
            <ClusterGroup
              chunkedLoading
              iconCreateFunction={(cluster) => {
                const count = cluster.getChildCount();
                const size = count < 10 ? "sm" : count < 50 ? "md" : "lg";
                const sizeClasses = {
                  sm: "w-8 h-8 text-xs",
                  md: "w-10 h-10 text-sm",
                  lg: "w-12 h-12 text-base",
                };

                // Sage theme colors
                const colorClass =
                  theme === "sage" ? "bg-[#7C9082]" : "bg-primary";

                const iconSize = count < 10 ? 32 : count < 50 ? 40 : 48;

                return L.divIcon({
                  html: `<div class="flex items-center justify-center ${colorClass} ${sizeClasses[size]} text-white font-bold rounded-xl border-2 border-white shadow-lg transition-all duration-200 hover:scale-110 hover:brightness-90">${count}</div>`,
                  className: "custom-cluster-icon",
                  iconSize: L.point(iconSize, iconSize),
                  iconAnchor: L.point(iconSize / 2, iconSize / 2),
                });
              }}
            >
              {validMarkers.map((marker, idx) => (
                <Marker
                  key={marker.id ?? `marker-${idx}`}
                  position={[marker.lat, marker.lng]}
                >
                  <Tooltip>{marker.label}</Tooltip>
                </Marker>
              ))}
            </ClusterGroup>
          )}

          <MapClickHandler onClick={onMapClick} />
        </MapContainer>
      </div>
    );
  },
);

Map.displayName = "Map";

/**
 * Internal function to get tile layer URL based on tile theme
 */
function getTileLayerUrl(
  tileTheme: "default" | "dark" | "light" | "satellite",
): string {
  if (tileTheme === "dark") {
    return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  }
  if (tileTheme === "light") {
    return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  }
  if (tileTheme === "satellite") {
    return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  }
  return "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
}