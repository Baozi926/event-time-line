import {
  CLASSIFIABLE_TOPIC_SLUGS,
  MIN_TOPIC_CLASSIFICATION_CONFIDENCE,
  type TopicClassificationResult,
  listClassifiableTopicsForPrompt,
} from '@event-time-line/shared';
import { recordLlmUsage } from '@event-time-line/database';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const DEEPSEEK_PROVIDER = 'deepseek';
const DEEPSEEK_OPERATION = 'topic_classification';
const SKIP_RECLASSIFY_CONFIDENCE = 0.7;

export function shouldSkipReclassification(maxConfidence: number | null | undefined): boolean {
  return typeof maxConfidence === 'number' && maxConfidence >= SKIP_RECLASSIFY_CONFIDENCE;
}

function buildSystemPrompt(): string {
  const topics = listClassifiableTopicsForPrompt()
    .map((topic) => `- ${topic.slug}: ${topic.name} — ${topic.description}`)
    .join('\n');

  return `你是新闻事件主题分类器。根据标题和摘要，判断事件属于哪些主题。

可选主题（只能使用以下 slug）：
${topics}

规则：
1. 只返回确实相关的主题，不要勉强归类。
2. confidence 取值 0 到 1，表示把握程度。
3. reason 用一句中文说明归类依据，引用标题/摘要中的关键信息。
4. 一条新闻可以同时属于多个主题，但通常不超过 3 个。
5. 若与任何主题都不相关，返回空数组。
6. 仅输出 JSON，格式：{"topics":[{"slug":"ai","confidence":0.86,"reason":"..."}]}`;
}

function buildUserPrompt(
  title: string,
  summary?: string | null,
  categoryHint?: string | null,
): string {
  const parts = [`标题：${title}`];
  if (summary?.trim()) parts.push(`摘要：${summary.trim()}`);
  if (categoryHint?.trim()) parts.push(`来源分类提示：${categoryHint.trim()}`);
  return parts.join('\n');
}

function parseModelResponse(content: string): TopicClassificationResult[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return [];
    parsed = JSON.parse(match[0]);
  }

  const topics = (parsed as { topics?: unknown }).topics;
  if (!Array.isArray(topics)) return [];

  const allowed = new Set(CLASSIFIABLE_TOPIC_SLUGS);
  const results: TopicClassificationResult[] = [];

  for (const item of topics) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const slug = typeof record.slug === 'string' ? record.slug.trim().toLowerCase() : '';
    const confidence = Number(record.confidence);
    const reason = typeof record.reason === 'string' ? record.reason.trim() : '';

    if (!allowed.has(slug)) continue;
    if (!Number.isFinite(confidence) || confidence < MIN_TOPIC_CLASSIFICATION_CONFIDENCE) continue;
    if (!reason) continue;

    results.push({
      slug,
      confidence: Math.min(1, Math.max(0, confidence)),
      reason,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

export async function classifyEventWithDeepSeek(
  apiKey: string,
  title: string,
  summary?: string | null,
  categoryHint?: string | null,
): Promise<TopicClassificationResult[]> {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) return [];

  let recorded = false;
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedApiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(title, summary, categoryHint) },
        ],
      }),
    });

    if (!response.ok) {
      await recordLlmUsage(DEEPSEEK_PROVIDER, DEEPSEEK_OPERATION, { success: false });
      recorded = true;
      const body = await response.text().catch(() => '');
      throw new Error(`DeepSeek API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    await recordLlmUsage(DEEPSEEK_PROVIDER, DEEPSEEK_OPERATION, { success: true });
    recorded = true;

    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    return parseModelResponse(content);
  } catch (error) {
    if (!recorded) {
      await recordLlmUsage(DEEPSEEK_PROVIDER, DEEPSEEK_OPERATION, { success: false });
    }
    throw error;
  }
}
