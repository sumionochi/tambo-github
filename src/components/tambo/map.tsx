"use client";

import { cn } from "@/lib/utils";
import {
  createElementObject,
  createLayerComponent,
  updateGridLayer,
  type LayerProps,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import {
  GenerationStage,
  useTambo,
  useTamboCurrentMessage,
} from "@tambo-ai/react";
import { cva, type VariantProps } from "class-variance-authority";
import L, {
  type HeatLatLngTuple,
  type LatLng,
  type MarkerClusterGroupOptions,
} from "leaflet";
// ⚠️ CRITICAL: This CSS controls tile grid layout, zoom controls, markers.
// Without it, map tiles render as broken fragments.
import "leaflet/dist/leaflet.css";

import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import * as React from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { z } from "zod/v3";

/**
 * Props interface for MarkerClusterGroup component
 */
interface MarkerClusterGroupProps extends MarkerClusterGroupOptions {
  children?: React.ReactNode;
  iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon;
}

/**
 * ClusterGroup component for grouping markers on the map
 */
const ClusterGroup: React.FC<MarkerClusterGroupProps> = ({
  children,
  iconCreateFunction,
  ...options
}) => {
  const map = useMapEvents({});
  const clusterGroupRef = React.useRef<L.MarkerClusterGroup | null>(null);
  const optionsString = React.useMemo(() => JSON.stringify(options), [options]);

  React.useEffect(() => {
    if (!map) return;
    const clusterGroup = L.markerClusterGroup({
      ...options,
      iconCreateFunction,
    });
    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<
          L.MarkerOptions & {
            position: L.LatLngExpression;
            children?: React.ReactNode;
          }
        >;

        if (element.props.position) {
          const marker = L.marker(element.props.position, element.props);

          const childNodes = React.Children.toArray(element.props.children);
          const tooltipChild = childNodes.find(
            (c) => React.isValidElement(c) && c.type === Tooltip,
          ) as
            | React.ReactElement<
                L.TooltipOptions & { children: React.ReactNode }
              >
            | undefined;

          if (tooltipChild) {
            marker.bindTooltip(tooltipChild.props.children as any, {
              direction: tooltipChild.props.direction ?? "auto",
              permanent: tooltipChild.props.permanent ?? false,
              sticky: tooltipChild.props.sticky ?? false,
              opacity: tooltipChild.props.opacity ?? 0.9,
            });
          }

          clusterGroup.addLayer(marker);
        }
      }
    });

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, children, optionsString, iconCreateFunction, options]);

  return null;
};

/**
 * Props interface for HeatLayer component
 */
interface HeatLayerProps extends LayerProps, L.HeatMapOptions {
  latlngs: (LatLng | HeatLatLngTuple)[];
}

const createHeatLayer = (
  { latlngs, ...options }: HeatLayerProps,
  context: LeafletContextInterface,
) => {
  const layer = L.heatLayer(latlngs, options);
  return createElementObject(layer, context);
};

const updateHeatLayer = (
  layer: L.HeatLayer,
  { latlngs, ...options }: HeatLayerProps,
  prevProps: HeatLayerProps,
) => {
  layer.setLatLngs(latlngs);
  layer.setOptions(options);
  updateGridLayer(layer, options, prevProps);
};

const HeatLayer = createLayerComponent<L.HeatLayer, HeatLayerProps>(
  createHeatLayer,
  updateHeatLayer,
);

/**
 * Fix for Leaflet marker icons in SSR/Next.js environments
 */
if (typeof window !== "undefined") {
  void import("leaflet").then((L) => {
    delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })
      ._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
    void import("leaflet.heat");
  });
}

export const mapVariants = cva(
  "w-full transition-all duration-200 bg-background border border-border",
  {
    variants: {
      size: {
        sm: "h-[200px]",
        md: "h-[300px]",
        lg: "h-[500px]",
        full: "h-full w-full",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-md",
        md: "rounded-lg",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      size: "md",
      rounded: "md",
    },
  },
);

export const markerSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string(),
  id: z.string().optional(),
});

export const heatDataSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  intensity: z.number().min(0).max(1),
});

export const mapSchema = z.object({
  center: z.object({ lat: z.number(), lng: z.number() }),
  zoom: z.number().min(1).max(20).default(10),
  markers: z.array(markerSchema).default([]),
  heatData: z.array(heatDataSchema).optional().nullable(),
  zoomControl: z.boolean().optional().default(true),
  className: z
    .string()
    .optional()
    .describe("Optional tailwind className for the map container"),
  size: z.enum(["sm", "md", "lg", "full"]).optional(),
  tileTheme: z.enum(["default", "dark", "light", "satellite"]).optional(),
  rounded: z.enum(["none", "sm", "md", "full"]).optional(),
});

export type MarkerData = z.infer<typeof markerSchema>;
export type HeatData = z.infer<typeof heatDataSchema>;
export type MapProps = z.infer<typeof mapSchema> &
  VariantProps<typeof mapVariants> & {
    /** @deprecated Use tileTheme instead */
    theme?: "default" | "dark" | "light" | "satellite";
    /** Array of [lat, lng] points to draw as a route polyline */
    routeLine?: [number, number][];
    /** Route polyline color (default: sage) */
    routeColor?: string;
    /** Use numbered circle markers instead of default pins (for routes) */
    numberedMarkers?: boolean;
    /** Auto-fit map bounds to show all markers + route */
    fitBounds?: boolean;
  };

function useValidMarkers(markers: MarkerData[] = []) {
  return React.useMemo(
    () =>
      (markers || []).filter(
        (m) =>
          typeof m.lat === "number" &&
          m.lat >= -90 &&
          m.lat <= 90 &&
          typeof m.lng === "number" &&
          m.lng >= -180 &&
          m.lng <= 180 &&
          typeof m.label === "string" &&
          m.label.length > 0,
      ),
    [markers],
  );
}

function useValidHeatData(heatData?: HeatData[] | null) {
  return React.useMemo(() => {
    if (!Array.isArray(heatData)) return [];
    return heatData
      .filter(
        (d) =>
          typeof d.lat === "number" &&
          d.lat >= -90 &&
          d.lat <= 90 &&
          typeof d.lng === "number" &&
          d.lng >= -180 &&
          d.lng <= 180 &&
          typeof d.intensity === "number" &&
          d.intensity >= 0 &&
          d.intensity <= 1,
      )
      .map((d) => [d.lat, d.lng, d.intensity] as HeatLatLngTuple);
  }, [heatData]);
}

function LoadingSpinner() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="flex items-center gap-1 h-4">
          <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.2s]"></span>
          <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.1s]"></span>
        </div>
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  );
}

function MapClickHandler() {
  const animateRef = React.useRef(true);
  useMapEvents({
    click: (e: { latlng: L.LatLng; target: L.Map }) => {
      const map: L.Map = e.target;
      map.setView(e.latlng, map.getZoom(), { animate: animateRef.current });
    },
  });
  return null;
}

/**
 * Fixes broken tile rendering when Leaflet initializes inside a
 * dynamically-loaded container (next/dynamic with ssr:false).
 * The container may not have its final dimensions when Leaflet
 * calculates tile positions — invalidateSize() forces recalculation.
 */
function MapResizeHandler() {
  const map = useMapEvents({});

  React.useEffect(() => {
    if (!map) return;

    // Immediate + delayed invalidateSize to catch layout shifts
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
    ];

    // Also invalidate on window resize
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);

  return null;
}

/**
 * Auto-fits the map viewport to show all markers and route line.
 * Uses padding to ensure nothing is cut off at edges.
 */
function FitBoundsHandler({
  markers,
  routeLine,
}: {
  markers: MarkerData[];
  routeLine?: [number, number][];
}) {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;

    const points: L.LatLngExpression[] = [];

    // Add all marker positions
    markers.forEach((m) => points.push([m.lat, m.lng]));

    // Add route line points (sample every Nth for perf)
    if (routeLine && routeLine.length > 0) {
      const step = Math.max(1, Math.floor(routeLine.length / 50));
      for (let i = 0; i < routeLine.length; i += step) {
        points.push(routeLine[i]);
      }
      // Always include last point
      points.push(routeLine[routeLine.length - 1]);
    }

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      // Delay to ensure map container is sized
      setTimeout(() => {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }, 200);
    }
  }, [map, markers, routeLine]);

  return null;
}

/**
 * Creates a numbered circle DivIcon for route stop markers.
 * Sage-colored circle with white number text.
 */
function createNumberedIcon(number: number, isFirst: boolean, isLast: boolean) {
  const bg = isFirst
    ? "#3D643D" // dark sage for origin
    : isLast
      ? "#B91C1C" // red for destination
      : "#5B8F5B"; // sage for intermediate

  const size = isFirst || isLast ? 32 : 26;

  return L.divIcon({
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${bg};
      color:white;
      border: 2.5px solid white;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:${isFirst || isLast ? 13 : 11}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      font-family: system-ui, -apple-system, sans-serif;
    ">${number}</div>`,
    className: "route-numbered-marker",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

// ═══════════════════════════════════════════════════════════════
// SAFE HOOKS — allow Map to render BOTH inside Tambo message
// threads (chat) AND standalone in tab views (LocationMap)
// ═══════════════════════════════════════════════════════════════

/**
 * Safe wrapper for useTambo — returns null thread when outside TamboProvider
 */
function useTamboSafe() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useTambo();
  } catch {
    return { thread: null } as any;
  }
}

/**
 * Safe wrapper for useTamboCurrentMessage — returns null when
 * outside TamboMessageProvider (e.g., when Map is rendered in
 * LocationMap tab view instead of inside a chat message)
 */
function useTamboCurrentMessageSafe() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useTamboCurrentMessage();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════

/**
 * Interactive map component with support for markers, heatmaps, and clustering
 */
export const Map = React.forwardRef<HTMLDivElement, MapProps>(
  (
    {
      center,
      zoom = 10,
      markers = [],
      heatData,
      zoomControl = true,
      className,
      size = "md",
      tileTheme,
      theme,
      rounded = "md",
      routeLine,
      routeColor = "#3D643D",
      numberedMarkers = false,
      fitBounds = false,
      ...props
    },
    ref,
  ) => {
    // Support deprecated theme prop, prefer tileTheme
    const effectiveTileTheme = tileTheme ?? theme ?? "default";

    // ── SAFE: works both inside and outside Tambo message context ──
    const { thread } = useTamboSafe();
    const currentMessage = useTamboCurrentMessageSafe();

    const message = thread?.messages?.[thread?.messages?.length - 1];

    const isLatestMessage = message?.id && message.id === currentMessage?.id;

    const generationStage = thread?.generationStage;
    const isGenerating =
      generationStage &&
      generationStage !== GenerationStage.COMPLETE &&
      generationStage !== GenerationStage.ERROR;

    const validMarkers = useValidMarkers(markers);
    const validHeatData = useValidHeatData(heatData);

    // Show loading state during generation
    if (isLatestMessage && isGenerating) {
      return (
        <div
          ref={ref}
          className={cn(mapVariants({ size, rounded }), className)}
          {...props}
        >
          <LoadingSpinner />
        </div>
      );
    }

    // Show error state if center coordinates are missing
    if (!center) {
      return (
        <div
          ref={ref}
          className={cn(mapVariants({ size, rounded }), className)}
          {...props}
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-destructive text-center">
              <p className="font-medium">Invalid Map Data</p>
              <p className="text-sm mt-1">
                Center coordinates are required to display the map.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          mapVariants({ size, rounded }),
          "overflow-hidden",
          className,
        )}
        {...props}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          className="h-full w-full"
          scrollWheelZoom
          zoomControl={zoomControl}
        >
          <TileLayer url={getTileLayerUrl(effectiveTileTheme)} />

          {validHeatData.length > 0 && (
            <HeatLayer
              latlngs={validHeatData}
              radius={25}
              blur={15}
              maxZoom={20}
              minOpacity={0.45}
            />
          )}

          {/* Route polyline — drawn BEFORE markers so markers appear on top */}
          {routeLine && routeLine.length >= 2 && (
            <>
              {/* Shadow line for depth */}
              <Polyline
                positions={routeLine}
                pathOptions={{
                  color: "#00000020",
                  weight: 8,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              {/* Main route line */}
              <Polyline
                positions={routeLine}
                pathOptions={{
                  color: routeColor,
                  weight: 4,
                  opacity: 0.85,
                  lineCap: "round",
                  lineJoin: "round",
                  dashArray: undefined,
                }}
              />
            </>
          )}

          {/* Numbered route markers (no clustering) */}
          {numberedMarkers && validMarkers.length > 0 ? (
            <>
              {validMarkers.map((marker, idx) => (
                <Marker
                  key={marker.id ?? `route-marker-${idx}`}
                  position={[marker.lat, marker.lng]}
                  icon={createNumberedIcon(
                    idx + 1,
                    idx === 0,
                    idx === validMarkers.length - 1,
                  )}
                >
                  <Tooltip direction="top" offset={[0, -14]}>
                    {marker.label}
                  </Tooltip>
                </Marker>
              ))}
            </>
          ) : (
            /* Standard clustered markers */
            <ClusterGroup
              chunkedLoading
              animate
              animateAddingMarkers
              zoomToBoundsOnClick
              maxClusterRadius={75}
              showCoverageOnHover={false}
              spiderfyOnMaxZoom
              spiderfyDistanceMultiplier={1.5}
              iconCreateFunction={(cluster: L.MarkerCluster) => {
                const count = cluster.getChildCount();
                let size: "small" | "medium" | "large" = "small";
                let colorClass = "bg-blue-500";
                if (count < 10) {
                  size = "small";
                  colorClass = "bg-blue-500";
                } else if (count < 100) {
                  size = "medium";
                  colorClass = "bg-orange-500";
                } else {
                  size = "large";
                  colorClass = "bg-red-500";
                }
                const sizeClasses: Record<
                  "small" | "medium" | "large",
                  string
                > = {
                  small: "w-8 h-8 text-xs",
                  medium: "w-10 h-10 text-sm",
                  large: "w-12 h-12 text-base",
                };
                let iconSize = 48;
                if (size === "small") {
                  iconSize = 32;
                } else if (size === "medium") {
                  iconSize = 40;
                }
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

          {/* Auto-fit bounds to show full route */}
          {fitBounds && (
            <FitBoundsHandler markers={validMarkers} routeLine={routeLine} />
          )}

          <MapClickHandler />
          <MapResizeHandler />
        </MapContainer>
      </div>
    );
  },
);

Map.displayName = "Map";

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
  return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}