'use client';

import { useState } from 'react';
import {
  GDELT_CATEGORY_LABELS,
  HOT_TREND_FETCH_INTERVAL_OPTIONS,
  formatMinutesLabel,
  type DataSourcesSettings,
  type HotTrendPlatformConfig,
} from '@event-time-line/shared';
import { updateDataSourcesSettings, updateDeepSeekApiKey, updateEmbeddingApiKey } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-blue-100/80 bg-gradient-to-r from-blue-50/30 to-white px-3 py-2.5 transition-colors hover:border-blue-200 ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
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
  deepSeekApiKeyConfigured,
  embeddingApiKeyConfigured,
  embeddingServiceReachable,
}: {
  initial: DataSourcesSettings;
  valyuApiKeyConfigured: boolean;
  deepSeekApiKeyConfigured: boolean;
  embeddingApiKeyConfigured: boolean;
  embeddingServiceReachable: boolean;
}) {
  const [settings, setSettings] = useState<DataSourcesSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deepSeekConfigured, setDeepSeekConfigured] = useState(
    deepSeekApiKeyConfigured,
  );
  const [deepSeekApiKeyInput, setDeepSeekApiKeyInput] = useState('');
  const [savingDeepSeekKey, setSavingDeepSeekKey] = useState(false);
  const [embeddingConfigured, setEmbeddingConfigured] = useState(
    embeddingApiKeyConfigured,
  );
  const [embeddingReachable, setEmbeddingReachable] = useState(
    embeddingServiceReachable,
  );
  const [embeddingApiKeyInput, setEmbeddingApiKeyInput] = useState('');
  const [savingEmbeddingKey, setSavingEmbeddingKey] = useState(false);
  const [expandedGdeltKey, setExpandedGdeltKey] = useState<string | null>(null);
  const [newPlatform, setNewPlatform] = useState({
    id: '',
    name: '',
    expectedDomain: '',
  });

  async function persistSettings(
    next: DataSourcesSettings,
    successMessage?: string,
  ): Promise<boolean> {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await updateDataSourcesSettings(next);
      setSettings(res.settings);
      setDeepSeekConfigured(res.deepSeekApiKeyConfigured);
      setEmbeddingConfigured(res.embeddingApiKeyConfigured);
      setEmbeddingReachable(res.embeddingServiceReachable);
      setMessage(successMessage ?? res.message);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await persistSettings(settings);
  }

  async function handleAiEnhancementToggle(enabled: boolean) {
    if (enabled && !deepSeekConfigured) {
      setError('请先配置 DeepSeek API Key');
      return;
    }
    const previous = settings;
    const next: DataSourcesSettings = {
      ...settings,
      aiEnhancement: { ...settings.aiEnhancement, enabled },
    };
    setSettings(next);
    const ok = await persistSettings(
      next,
      enabled ? 'DeepSeek 分类增强已开启' : 'DeepSeek 分类增强已关闭',
    );
    if (!ok) setSettings(previous);
  }

  async function handleEmbeddingToggle(enabled: boolean) {
    const previous = settings;
    const next: DataSourcesSettings = {
      ...settings,
      embedding: { ...settings.embedding, enabled },
    };
    setSettings(next);
    const ok = await persistSettings(
      next,
      enabled ? '向量语义搜索已开启' : '向量语义搜索已关闭',
    );
    if (!ok) setSettings(previous);
  }

  async function handleSaveEmbeddingApiKey() {
    setSavingEmbeddingKey(true);
    setMessage(null);
    setError(null);
    try {
      const res = await updateEmbeddingApiKey(embeddingApiKeyInput);
      setEmbeddingConfigured(res.embeddingApiKeyConfigured);
      setEmbeddingApiKeyInput('');
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存 Embedding API Key 失败');
    } finally {
      setSavingEmbeddingKey(false);
    }
  }

  async function handleSaveDeepSeekApiKey() {
    setSavingDeepSeekKey(true);
    setMessage(null);
    setError(null);
    try {
      const res = await updateDeepSeekApiKey(deepSeekApiKeyInput);
      setDeepSeekConfigured(res.deepSeekApiKeyConfigured);
      setDeepSeekApiKeyInput('');
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存 DeepSeek API Key 失败');
    } finally {
      setSavingDeepSeekKey(false);
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
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/40 to-orange-50/20 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">AI 增强分类（DeepSeek）</h2>
            <Badge variant={deepSeekConfigured ? 'green' : 'slate'}>
              {deepSeekConfigured ? 'API Key 已配置' : '未配置 API Key'}
            </Badge>
            <Badge variant={settings.aiEnhancement.enabled ? 'orange' : 'slate'}>
              {settings.aiEnhancement.enabled ? '会产生调用费用' : '默认关闭'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            API Key 保存在系统设置中，不会回显到页面；只有开关开启且 Key 已配置时，
            Worker 才会调用 DeepSeek 做新闻主题分类。
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div>
            <FieldLabel hint="留空保存会清除已配置的 Key；页面不会回显现有 Key">
              DeepSeek API Key
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={deepSeekApiKeyInput}
                onChange={(event) => setDeepSeekApiKeyInput(event.target.value)}
                placeholder={
                  deepSeekConfigured ? '已配置，如需更换请粘贴新 Key' : '粘贴 DeepSeek API Key'
                }
                autoComplete="off"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleSaveDeepSeekApiKey}
                disabled={savingDeepSeekKey}
                className="btn-secondary text-xs"
              >
                {savingDeepSeekKey ? '保存中…' : deepSeekApiKeyInput.trim() ? '保存 Key' : '清除 Key'}
              </button>
            </div>
          </div>
          <ToggleRow
            label="启用 DeepSeek 事件分类增强"
            description={
              deepSeekConfigured
                ? '用于给事件打多维主题标签和生成推荐原因；关闭后使用关键词与语义向量兜底（勾选后立即保存）'
                : '需先在上方配置 DeepSeek API Key'
            }
            checked={settings.aiEnhancement.enabled}
            disabled={!deepSeekConfigured || saving}
            onChange={(enabled) => void handleAiEnhancementToggle(enabled)}
          />
          <p className="rounded-2xl bg-orange-50 px-3 py-2 text-xs leading-relaxed text-orange-700">
            这是付费增强能力。建议调试采集、批量回填或成本敏感时保持关闭；需要提升分类质量时再打开。
          </p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-blue-50 bg-gradient-to-r from-violet-50/40 to-blue-50/20 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">向量语义搜索</h2>
            <Badge variant={settings.embedding.enabled ? 'green' : 'slate'}>
              {settings.embedding.enabled ? '已启用' : '已关闭'}
            </Badge>
            <Badge variant={embeddingReachable ? 'green' : 'slate'}>
              {settings.embedding.provider === 'local'
                ? embeddingReachable ? '本地服务可达' : '本地服务未启动'
                : embeddingConfigured ? 'API Key 已配置' : '未配置 API Key'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            基于事件标题生成向量，用于关键词关注的语义召回。默认使用本机 bge-m3 模型；
            也可切换为 OpenAI 兼容的远程 embedding API。
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <ToggleRow
            label="启用向量语义搜索"
            description="关闭后关键词推荐回退到主题分类与规则匹配（勾选后立即保存）"
            checked={settings.embedding.enabled}
            disabled={saving}
            onChange={(enabled) => void handleEmbeddingToggle(enabled)}
          />

          <div>
            <FieldLabel>Embedding 提供方</FieldLabel>
            <div className="flex flex-wrap gap-3">
              {(['local', 'api'] as const).map((provider) => (
                <label
                  key={provider}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="embedding-provider"
                    checked={settings.embedding.provider === provider}
                    onChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        embedding: { ...prev.embedding, provider },
                      }))
                    }
                  />
                  {provider === 'local' ? '本地模型（默认）' : '远程 API'}
                </label>
              ))}
            </div>
          </div>

          {settings.embedding.provider === 'local' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel hint="默认 http://localhost:8082">本地服务地址</FieldLabel>
                <input
                  value={settings.embedding.local.baseUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      embedding: {
                        ...prev.embedding,
                        local: { ...prev.embedding.local, baseUrl: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <FieldLabel>本地模型名称</FieldLabel>
                <input
                  value={settings.embedding.local.model}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      embedding: {
                        ...prev.embedding,
                        local: { ...prev.embedding.local, model: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>远程 API Base URL</FieldLabel>
                  <input
                    value={settings.embedding.api.baseUrl}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        embedding: {
                          ...prev.embedding,
                          api: { ...prev.embedding.api, baseUrl: e.target.value },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <FieldLabel>远程模型名称</FieldLabel>
                  <input
                    value={settings.embedding.api.model}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        embedding: {
                          ...prev.embedding,
                          api: { ...prev.embedding.api, model: e.target.value },
                        },
                      }))
                    }
                    placeholder="text-embedding-3-small"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <FieldLabel hint="留空保存会清除已配置的 Key">Embedding API Key</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={embeddingApiKeyInput}
                    onChange={(e) => setEmbeddingApiKeyInput(e.target.value)}
                    placeholder={
                      embeddingConfigured ? '已配置，如需更换请粘贴新 Key' : '粘贴 API Key'
                    }
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEmbeddingApiKey}
                    disabled={savingEmbeddingKey}
                    className="btn-secondary text-xs"
                  >
                    {savingEmbeddingKey ? '保存中…' : embeddingApiKeyInput.trim() ? '保存 Key' : '清除 Key'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <FieldLabel hint="0.3 - 0.95，越高越严格">语义相似度阈值</FieldLabel>
            <input
              type="number"
              min={0.3}
              max={0.95}
              step={0.01}
              value={settings.embedding.minSimilarity}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  embedding: {
                    ...prev.embedding,
                    minSimilarity: Number(e.target.value),
                  },
                }))
              }
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <p className="rounded-2xl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-700">
            本地模式需先启动 <code className="text-[11px]">apps/embedding-service</code>。
            切换提供方后请执行 <code className="text-[11px]">pnpm worker:run embed-backfill --force</code> 重算历史向量。
          </p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/40 to-orange-50/20 px-5 py-4">
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
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/40 to-orange-50/20 px-5 py-4">
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
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/40 to-orange-50/20 px-5 py-4">
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
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/40 to-orange-50/20 px-5 py-4">
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
