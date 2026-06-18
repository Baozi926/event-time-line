import {
  SUBSCRIBABLE_TOPIC_SLUGS,
  TOPIC_DEFINITIONS,
  getTopicDefinition,
} from '@event-time-line/shared';

/** Build SQL OR clause matching events to a topic slug. */
export function buildTopicMatchSql(
  topicSlug: string,
  titleCol = 'e.title',
  summaryCol = 'e.summary',
  categoryCol = 'e.category_hint',
  eventIdCol = 'e.id',
): string | null {
  const def = getTopicDefinition(topicSlug);
  if (!def) return null;

  const parts: string[] = [];

  parts.push(`${categoryCol} = '${topicSlug}'`);
  if (def.gdeltCategoryKey && def.gdeltCategoryKey !== topicSlug) {
    parts.push(`${categoryCol} = '${def.gdeltCategoryKey}'`);
  }

  parts.push(`EXISTS (
    SELECT 1 FROM event_topics et
    JOIN topics t ON t.id = et.topic_id
    WHERE et.event_id = ${eventIdCol} AND t.slug = '${topicSlug}'
  )`);

  const textExpr = `lower(${titleCol} || ' ' || COALESCE(${summaryCol}, ''))`;
  for (const kw of def.keywords) {
    const escaped = kw.toLowerCase().replace(/'/g, "''");
    parts.push(`${textExpr} LIKE '%${escaped}%'`);
  }

  return `(${parts.join(' OR ')})`;
}

export function buildUserTopicsMatchSql(
  topicSlugs: string[],
  titleCol = 'e.title',
  summaryCol = 'e.summary',
  categoryCol = 'e.category_hint',
  eventIdCol = 'e.id',
): string | null {
  const clauses = topicSlugs
    .map((slug) => buildTopicMatchSql(slug, titleCol, summaryCol, categoryCol, eventIdCol))
    .filter((c): c is string => c !== null);

  if (clauses.length === 0) return null;
  return `(${clauses.join(' OR ')})`;
}

export function isValidTopicSlug(slug: string): boolean {
  return SUBSCRIBABLE_TOPIC_SLUGS.includes(slug);
}

export function listAvailableTopics(subscribedSlugs: Set<string>) {
  return SUBSCRIBABLE_TOPIC_SLUGS.map((slug) => {
    const def = TOPIC_DEFINITIONS[slug];
    return {
      slug: def.slug,
      name: def.name,
      nameEn: def.nameEn,
      icon: def.icon,
      subscribed: subscribedSlugs.has(slug),
    };
  });
}
