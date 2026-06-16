export const EVENT_DOMINANT_JOINS = `
  LEFT JOIN LATERAL (
    SELECT s.country_code
    FROM event_articles ea
    JOIN articles a ON a.id = ea.article_id
    JOIN sources s ON s.id = a.source_id
    WHERE ea.event_id = e.id AND s.country_code IS NOT NULL
    GROUP BY s.country_code
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) dominant ON true
  LEFT JOIN LATERAL (
    SELECT lower(left(a.language, 2)) AS language_code
    FROM event_articles ea
    JOIN articles a ON a.id = ea.article_id
    WHERE ea.event_id = e.id AND a.language IS NOT NULL AND trim(a.language) <> ''
    GROUP BY lower(left(a.language, 2))
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) dominant_lang ON true
`;

export function parseEventFilterParams(query: {
  category?: string;
  country?: string;
  language?: string;
}) {
  return {
    categoryFilter: query.category || null,
    countryFilter: query.country?.toUpperCase() || null,
    languageFilter: query.language?.toLowerCase().slice(0, 2) || null,
  };
}

export const EVENT_LIST_FILTER_CLAUSE = `
  AND ($3::text IS NULL OR e.category_hint = $3)
  AND ($4::text IS NULL OR dominant.country_code = $4)
  AND ($5::text IS NULL OR dominant_lang.language_code = $5)
`;

export const EVENT_COUNT_FILTER_CLAUSE = `
  AND ($1::text IS NULL OR e.category_hint = $1)
  AND ($2::text IS NULL OR dominant.country_code = $2)
  AND ($3::text IS NULL OR dominant_lang.language_code = $3)
`;

export function mapFacetRows(rows: Array<{ value: string; count: string }>) {
  return rows
    .map((r) => ({
      value: r.value,
      count: parseInt(r.count, 10),
    }))
    .filter((r) => r.count > 0);
}
