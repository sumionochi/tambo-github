// app/api/map/geocode/route.ts
// Server-side proxy for OpenStreetMap Nominatim geocoding
// Fixes: browser forbidden User-Agent header, rate limits, CORS issues
import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "TamboBrowser/1.0 (research-app; contact@tambo-browser.dev)";

// Simple in-memory rate limiter: 1 req/sec per Nominatim usage policy
let lastRequestTime = 0;

async function nominatimFetch(url: string): Promise<any> {
  // Enforce 1 request per second
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim returned ${response.status}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const mode = searchParams.get("mode") || "search"; // search | explore | route
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    if (!query && mode !== "explore") {
      return NextResponse.json(
        { error: "Missing query parameter 'q'" },
        { status: 400 }
      );
    }

    // ── MODE: Basic search ──
    if (mode === "search") {
      const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
        query!
      )}&limit=${limit}&addressdetails=1`;
      const data = await nominatimFetch(url);

      const results = (data || []).map((place: any, i: number) => ({
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        label: place.display_name?.split(",")[0] || "Unknown",
        fullName: place.display_name || "",
        type: place.type || "",
        category: place.class || "",
        id: `search-${i}`,
      }));

      return NextResponse.json({ results, count: results.length });
    }

    // ── MODE: City Explorer (sequential to respect rate limit) ──
    if (mode === "explore") {
      const cityName = query;
      if (!cityName) {
        return NextResponse.json(
          { error: "Missing city name" },
          { status: 400 }
        );
      }

      // First, geocode the city itself to get center coordinates
      const cityUrl = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
        cityName
      )}&limit=1`;
      const cityData = await nominatimFetch(cityUrl);

      let center = null;
      if (cityData && cityData.length > 0) {
        center = {
          lat: parseFloat(cityData[0].lat),
          lng: parseFloat(cityData[0].lon),
        };
      }

      // Search for landmarks sequentially (respects rate limit)
      const categories = [
        "museum",
        "park",
        "monument",
        "church",
        "square",
        "castle",
        "theatre",
      ];
      const allResults: any[] = [];

      for (const category of categories) {
        if (allResults.length >= 15) break; // Cap at 15 markers

        try {
          const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
            category
          )}+in+${encodeURIComponent(cityName)}&limit=3`;
          const data = await nominatimFetch(url);

          if (data && Array.isArray(data)) {
            for (const place of data.slice(0, 2)) {
              allResults.push({
                lat: parseFloat(place.lat),
                lng: parseFloat(place.lon),
                label: place.display_name?.split(",")[0] || category,
                fullName: place.display_name || "",
                type: category,
                id: `explore-${allResults.length}`,
              });
            }
          }
        } catch {
          // Skip failed categories, continue with others
          continue;
        }
      }

      return NextResponse.json({
        results: allResults,
        count: allResults.length,
        center:
          center ||
          (allResults.length > 0
            ? { lat: allResults[0].lat, lng: allResults[0].lng }
            : null),
        city: cityName,
      });
    }

    // ── MODE: Route (geocode + OSRM driving directions) ──
    if (mode === "route") {
      const locations = (query || "")
        .split("|")
        .map((l) => l.trim())
        .filter(Boolean);

      if (locations.length < 2) {
        return NextResponse.json(
          { error: "Route requires at least 2 locations (separated by |)" },
          { status: 400 }
        );
      }

      // Step 1: Geocode all stops
      const results: any[] = [];
      for (let i = 0; i < locations.length; i++) {
        try {
          const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
            locations[i]
          )}&limit=1`;
          const data = await nominatimFetch(url);

          if (data && data.length > 0) {
            results.push({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              label: `Stop ${i + 1}: ${
                data[0].display_name?.split(",")[0] || locations[i]
              }`,
              shortLabel: data[0].display_name?.split(",")[0] || locations[i],
              fullName: data[0].display_name || locations[i],
              id: `route-${i}`,
              stopNumber: i + 1,
            });
          }
        } catch {
          continue;
        }
      }

      if (results.length < 2) {
        return NextResponse.json(
          {
            error:
              "Could not geocode enough locations for a route (need at least 2)",
          },
          { status: 404 }
        );
      }

      // Step 2: Call OSRM for actual driving route
      // OSRM uses lng,lat order (GeoJSON convention)
      const coords = results.map((r) => `${r.lng},${r.lat}`).join(";");
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

      let routeGeometry: [number, number][] = [];
      let totalDistance = 0; // meters
      let totalDuration = 0; // seconds
      let legs: { distance: number; duration: number }[] = [];

      try {
        const osrmRes = await fetch(osrmUrl, {
          headers: { "User-Agent": USER_AGENT },
        });

        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          const route = osrmData?.routes?.[0];

          if (route) {
            // Convert GeoJSON [lng, lat] → Leaflet [lat, lng]
            routeGeometry = (route.geometry?.coordinates || []).map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            totalDistance = route.distance || 0;
            totalDuration = route.duration || 0;

            legs = (route.legs || []).map((leg: any) => ({
              distance: leg.distance || 0,
              duration: leg.duration || 0,
            }));
          }
        }
      } catch (osrmErr) {
        // OSRM failed — fall back to straight lines between stops
        console.warn(
          "OSRM routing failed, falling back to straight lines:",
          osrmErr
        );
        routeGeometry = results.map((r) => [r.lat, r.lng] as [number, number]);

        // Estimate distance/duration from straight-line (Haversine)
        for (let i = 0; i < results.length - 1; i++) {
          const d = haversineDistance(
            results[i].lat,
            results[i].lng,
            results[i + 1].lat,
            results[i + 1].lng
          );
          const dur = (d / 80) * 3600; // Assume ~80 km/h average
          legs.push({ distance: d * 1000, duration: dur });
          totalDistance += d * 1000;
          totalDuration += dur;
        }
      }

      // Calculate bounding box for auto-fit
      const allLats = results.map((r) => r.lat);
      const allLngs = results.map((r) => r.lng);
      const bounds = {
        southWest: { lat: Math.min(...allLats), lng: Math.min(...allLngs) },
        northEast: { lat: Math.max(...allLats), lng: Math.max(...allLngs) },
      };

      const avgLat = results.reduce((s, m) => s + m.lat, 0) / results.length;
      const avgLng = results.reduce((s, m) => s + m.lng, 0) / results.length;

      return NextResponse.json({
        results,
        count: results.length,
        center: { lat: avgLat, lng: avgLng },
        // Route-specific data
        route: {
          geometry: routeGeometry,
          totalDistance, // meters
          totalDuration, // seconds
          legs, // per-leg { distance, duration }
          bounds,
        },
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error: any) {
    console.error("Geocode API error:", error);
    return NextResponse.json(
      { error: error.message || "Geocoding failed" },
      { status: 500 }
    );
  }
}

/**
 * Haversine distance between two points in kilometers.
 * Used as fallback when OSRM is unavailable.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
