import type { RawArticle } from '@event-time-line/shared';
import type { UsgsSourceSettings } from '@event-time-line/shared';
import { toIsoStringSafe } from '../utils.js';
import { loadDataSourcesSettings } from '../services/data-sources-settings.js';

interface UsgsFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
    tsunami: number;
    sig: number;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

export async function fetchUsgsEarthquakes(
  usgsSettings?: UsgsSourceSettings,
): Promise<RawArticle[]> {
  const { settings } = await loadDataSourcesSettings();
  const config = usgsSettings ?? settings.usgs;

  if (!config.enabled) {
    console.log('[usgs] Skipped (disabled in data source settings)');
    return [];
  }

  const now = new Date().toISOString();

  const response = await fetch(config.feedUrl, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`USGS fetch failed: ${response.status} ${response.statusText}`);
  }

  const geojson = (await response.json()) as { features?: UsgsFeature[] };
  const features = geojson.features ?? [];

  return features
    .filter((f) => f.properties.mag >= config.minMagnitude)
    .sort((a, b) => b.properties.mag - a.properties.mag)
    .map((feature) => {
      const { mag, place, time, url, tsunami } = feature.properties;
      const [longitude, latitude] = feature.geometry.coordinates;
      const title = `M${mag.toFixed(1)} earthquake — ${place}`;
      const eventUrl = url || `https://earthquake.usgs.gov/earthquakes/eventpage/${feature.id}`;

      return {
        sourceType: 'usgs_earthquake' as const,
        externalId: feature.id,
        url: eventUrl,
        title,
        domain: 'earthquake.usgs.gov',
        language: 'en',
        publishedAt: toIsoStringSafe(new Date(time)),
        snippet: `Magnitude ${mag.toFixed(1)} at ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°${tsunami === 1 ? ' (tsunami alert)' : ''}`,
        categoryHint: 'disaster',
        fetchedAt: now,
      } satisfies RawArticle;
    });
}
