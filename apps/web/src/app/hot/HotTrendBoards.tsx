import type { HotTrendPlatformBoard } from '@event-time-line/shared';
import { HotTrendTrackButton } from './HotTrendTrackButton';

function formatUpdatedAt(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RankBadge({ rank }: { rank: number }) {
  const top = rank <= 3;
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black tabular-nums shadow-sm ${
        top
          ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
          : 'bg-blue-50 text-slate-500 ring-1 ring-blue-100'
      }`}
    >
      {rank}
    </span>
  );
}

function PlatformBoard({ board }: { board: HotTrendPlatformBoard }) {
  const updatedLabel = formatUpdatedAt(board.updatedAt);

  return (
    <section className="card flex min-h-[280px] flex-col">
      <header className="border-b border-blue-50 bg-gradient-to-r from-blue-50/50 to-orange-50/30 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {board.platformName}
          </h2>
          {updatedLabel && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] tabular-nums text-slate-500">
              {updatedLabel}
            </span>
          )}
        </div>
      </header>

      {board.error && (
        <p className="px-4 py-3 text-sm text-amber-800">{board.error}</p>
      )}

      {board.items.length === 0 && !board.error && (
        <p className="px-4 py-6 text-sm text-slate-500">这个平台暂时没动静</p>
      )}

      {board.items.length > 0 && (
        <ol className="divide-y divide-blue-50">
          {board.items.map((item) => (
            <li
              key={`${board.platformId}-${item.rank}-${item.url}`}
              className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-blue-50/50"
            >
              <RankBadge rank={item.rank} />
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1"
              >
                <span className="line-clamp-2 text-sm leading-snug text-slate-800 hover:text-brand-700">
                  {item.title}
                </span>
              </a>
              <HotTrendTrackButton
                platformId={board.platformId}
                platformName={board.platformName}
                title={item.title}
                url={item.url}
                rank={item.rank}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function HotTrendBoards({ boards }: { boards: HotTrendPlatformBoard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {boards.map((board) => (
        <PlatformBoard key={board.platformId} board={board} />
      ))}
    </div>
  );
}
