'use client';

import { AdminUntrackButton } from '@/components/AdminUntrackButton';
import { SubscribeButton } from '@/components/SubscribeButton';

export function EventActionPanel({
  eventId,
  slug,
  subscribed = false,
  showAdminUntrack = false,
  compact = false,
}: {
  eventId: string;
  slug: string;
  subscribed?: boolean;
  showAdminUntrack?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'flex items-center gap-2' : 'card overflow-hidden'}>
      {!compact && (
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/50 to-orange-50/30 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">关注管理</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            已加入关注的事件会持续追踪并补充相关报道。
          </p>
        </div>
      )}

      <div
        className={
          compact
            ? 'flex flex-1 flex-wrap items-center justify-end gap-2'
            : 'space-y-3 p-4'
        }
      >
        <SubscribeButton eventId={eventId} subscribed={subscribed} />
        {showAdminUntrack && (
          <AdminUntrackButton slug={slug} redirectTo="/" />
        )}
      </div>
    </div>
  );
}

export function EventActionBar({
  eventId,
  slug,
  subscribed = false,
  showAdminUntrack = false,
}: {
  eventId: string;
  slug: string;
  subscribed?: boolean;
  showAdminUntrack?: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100/90 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <EventActionPanel
        eventId={eventId}
        slug={slug}
        subscribed={subscribed}
        showAdminUntrack={showAdminUntrack}
        compact
      />
    </div>
  );
}
