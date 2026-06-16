'use client';

import { useState } from 'react';
import {
  GDELT_CATEGORY_LABELS,
  HOT_TREND_FETCH_INTERVAL_OPTIONS,
  formatMinutesLabel,
  type DataSourcesSettings,
  type HotTrendPlatformConfig,
} from '@event-time-line/shared';
import { updateDataSourcesSettings } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="min-w-0">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        )}
      </span>
    </label>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label className="text-xs font-medium text-slate-700">{children}</label>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function DataSourcesSettingsManager({
  initial,
  valyuApiKeyConfigured,
}: {
  initial: DataSourcesSettings;
  valyuApiKeyConfigured: boolean;
}) {
  const [settings, setSettings] = useState<DataSourcesSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedGdeltKey, setExpandedGdeltKey] = useState<string | null>(null);
  const [newPlatform, setNewPlatform] = useState({
    id: '',
    name: '',
    expectedDomain: '',
  });

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await updateDataSourcesSettings(settings);
      setSettings(res.settings);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function updateGdeltCategory(
    key: string,
    patch: Partial<{ enabled: boolean; query: string }>,
  ) {
    setSettings((prev) => ({
      ...prev,
      gdelt: {
        ...prev.gdelt,
        categories: prev.gdelt.categories.map((category) =>
          category.key === key ? { ...category, ...patch } : category,
        ),
      },
    }));
  }

  function updateHotTrendPlatform(
    id: string,
    patch: Partial<HotTrendPlatformConfig>,
  ) {
    setSettings((prev) => ({
      ...prev,
      hotTrend: {
        ...prev.hotTrend,
        platforms: prev.hotTrend.platforms.map((platform) =>
          platform.id === id ? { ...platform, ...patch } : platform,
        ),
      },
    }));
  }

  function updateValyuQuery(
    id: string,
    enabled: boolean,
  ) {
    setSettings((prev) => ({
      ...prev,
      valyu: {
        ...prev.valyu,
        queries: prev.valyu.queries.map((query) =>
          query.id === id ? { ...query, enabled } : query,
        ),
      },
    }));
  }

  function handleAddPlatform() {
    const id = newPlatform.id.trim();
    const name = newPlatform.name.trim();
    const expectedDomain = newPlatform.expectedDomain.trim().toLowerCase();
    if (!id || !name || !expectedDomain) {
      setError('请填写平台 ID、名称和主域名');
      return;
    }
    if (settings.hotTrend.platforms.some((p) => p.id === id)) {
      setError('平台 ID 已存在');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      hotTrend: {
        ...prev.hotTrend,
        platforms: [
          ...prev.hotTrend.platforms,
          {
            id,
            name,
            expectedDomain,
            language: 'zh',
            countryCode: 'CN',
            enabled: true,
          },
        ],
      },
    }));
    setNewPlatform({ id: '', name: '', expectedDomain: '' });
    setError(null);
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200/60">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/60">
          {error}
        </p>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">GDELT 新闻 API</h2>
            <Badge variant="green">主数据源</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            按分类关键词轮询全球新闻全文 API
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <ToggleRow
            label="启用 GDELT 采集"
            checked={settings.gdelt.enabled}
            onChange={(enabled) =>
              setSettings((prev) => ({
                ...prev,
                gdelt: { ...prev.gdelt, enabled },
              }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel hint="必须为 HTTPS">API 地址</FieldLabel>
              <input
                type="url"
                value={settings.gdelt.apiUrl}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    gdelt: { ...prev.gdelt, apiUrl: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel hint="分类之间的等待时间，避免限流">分类间隔（毫秒）</FieldLabel>
              <input
                type="number"
                min={1000}
                max={120000}
                step={1000}
                value={settings.gdelt.categoryDelayMs}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    gdelt: {
                      ...prev.gdelt,
                      categoryDelayMs: Number(e.target.value),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-700">采集分类</p>
            <div className="space-y-2">
              {settings.gdelt.categories.map((category) => (
                <div
                  key={category.key}
                  className="rounded-lg border border-slate-200/80 bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={category.enabled}
                      onChange={(e) =>
                        updateGdeltCategory(category.key, {
                          enabled: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {GDELT_CATEGORY_LABELS[category.key] ?? category.key}
                    </span>
                    <code className="text-[11px] text-slate-400">{category.key}</code>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGdeltKey(
                          expandedGdeltKey === category.key ? null : category.key,
                        )
                      }
                      className="ml-auto text-xs text-brand-600 hover:underline"
                    >
                      {expandedGdeltKey === category.key ? '收起查询' : '编辑查询'}
                    </button>
                  </div>
                  {expandedGdeltKey === category.key && (
                    <div className="border-t border-slate-100 px-3 py-2">
                      <textarea
                        value={category.query}
                        onChange={(e) =>
                          updateGdeltCategory(category.key, {
                            query: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">多平台热榜（NewsNow）</h2>
          <p className="mt-1 text-xs text-slate-500">
            通过 NewsNow API 拉取各平台热搜，平台 ID 需与 NewsNow 支持的 id 一致
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <ToggleRow
            label="启用热榜采集"
            checked={settings.hotTrend.enabled}
            onChange={(enabled) =>
              setSettings((prev) => ({
                ...prev,
                hotTrend: { ...prev.hotTrend, enabled },
              }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>NewsNow API 地址</FieldLabel>
              <input
                type="url"
                value={settings.hotTrend.apiUrl}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hotTrend: { ...prev.hotTrend, apiUrl: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel hint="Worker 定时拉取热榜的频率">采集间隔</FieldLabel>
              <select
                value={settings.hotTrend.fetchIntervalMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hotTrend: {
                      ...prev.hotTrend,
                      fetchIntervalMinutes: Number(e.target.value),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {HOT_TREND_FETCH_INTERVAL_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatMinutesLabel(minutes)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel hint="连续请求各平台之间的等待">平台请求间隔（毫秒）</FieldLabel>
              <input
                type="number"
                min={200}
                max={10000}
                step={100}
                value={settings.hotTrend.requestIntervalMs}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hotTrend: {
                      ...prev.hotTrend,
                      requestIntervalMs: Number(e.target.value),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {settings.hotTrend.platforms.map((platform) => (
              <label
                key={platform.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200/80 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={platform.enabled}
                  onChange={(e) =>
                    updateHotTrendPlatform(platform.id, {
                      enabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                <span className="text-sm text-slate-800">{platform.name}</span>
                <code className="text-[10px] text-slate-400">{platform.id}</code>
              </label>
            ))}
          </div>
          <div className="rounded-lg border border-dashed border-slate-200 p-3">
            <p className="mb-2 text-xs font-medium text-slate-600">添加自定义平台</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                placeholder="平台 ID（如 toutiao）"
                value={newPlatform.id}
                onChange={(e) =>
                  setNewPlatform((prev) => ({ ...prev, id: e.target.value }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="显示名称"
                value={newPlatform.name}
                onChange={(e) =>
                  setNewPlatform((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="主域名（如 toutiao.com）"
                value={newPlatform.expectedDomain}
                onChange={(e) =>
                  setNewPlatform((prev) => ({
                    ...prev,
                    expectedDomain: e.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddPlatform}
              className="btn-secondary mt-2 text-xs"
            >
              添加平台
            </button>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Valyu 新闻搜索</h2>
            <Badge variant={valyuApiKeyConfigured ? 'green' : 'slate'}>
              {valyuApiKeyConfigured ? 'API Key 已配置' : '未配置 API Key'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            API Key 通过环境变量 <code className="rounded bg-slate-100 px-1">VALYU_API_KEY</code> 配置，不在页面保存
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <ToggleRow
            label="启用 Valyu 采集"
            description={!valyuApiKeyConfigured ? '需先在环境变量中配置 VALYU_API_KEY' : undefined}
            checked={settings.valyu.enabled}
            onChange={(enabled) =>
              setSettings((prev) => ({
                ...prev,
                valyu: { ...prev.valyu, enabled },
              }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>查询间隔（毫秒）</FieldLabel>
              <input
                type="number"
                min={500}
                max={30000}
                value={settings.valyu.queryDelayMs}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    valyu: {
                      ...prev.valyu,
                      queryDelayMs: Number(e.target.value),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel>单次最大结果数</FieldLabel>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.valyu.maxResults}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    valyu: {
                      ...prev.valyu,
                      maxResults: Number(e.target.value),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel>回溯天数</FieldLabel>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.valyu.lookbackDays}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    valyu: {
                      ...prev.valyu,
                      lookbackDays: Number(e.target.value),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {settings.valyu.queries.map((query) => (
              <label
                key={query.id}
                className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={query.enabled}
                  onChange={(e) => updateValyuQuery(query.id, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                <span className="text-xs text-slate-700">
                  <Badge variant="slate">
                    {query.categoryHint}
                  </Badge>
                  <span className="ml-1.5">{query.query}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">USGS 地震 Feed</h2>
          <p className="mt-1 text-xs text-slate-500">美国地质调查局 GeoJSON 地震数据，免费无需 Key</p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <ToggleRow
            label="启用 USGS 地震采集"
            checked={settings.usgs.enabled}
            onChange={(enabled) =>
              setSettings((prev) => ({
                ...prev,
                usgs: { ...prev.usgs, enabled },
              }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Feed URL</FieldLabel>
              <input
                type="url"
                value={settings.usgs.feedUrl}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    usgs: { ...prev.usgs, feedUrl: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel hint="仅采集震级 ≥ 该值的地震">最低震级</FieldLabel>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={settings.usgs.minMagnitude}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    usgs: {
                      ...prev.usgs,
                      minMagnitude: Number(e.target.value),
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? '保存中…' : '保存数据源配置'}
        </button>
      </div>
    </div>
  );
}
