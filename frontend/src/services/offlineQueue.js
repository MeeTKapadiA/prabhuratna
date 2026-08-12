const QUEUE_KEY = 'prabhuratna_offline_invoice_queue';

function localNowSql() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function getQueue() {
  return readQueue();
}

export function enqueueInvoice(payload) {
  const queue = readQueue();
  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    payload,
    created_at: localNowSql()
  };
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function removeFromQueue(id) {
  const queue = readQueue().filter((item) => item.id !== id);
  writeQueue(queue);
  return queue;
}

export async function flushQueue(apiRequestFn) {
  const queue = readQueue();
  if (!queue.length || !isOnline()) {
    return { flushed: 0, failed: 0, remaining: queue.length };
  }

  let flushed = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      const res = await apiRequestFn('/billing/invoices', 'POST', item.payload);
      if (res?.success) {
        flushed += 1;
      } else {
        remaining.push(item);
        failed += 1;
      }
    } catch {
      remaining.push(item);
      failed += 1;
    }
  }

  writeQueue(remaining);
  return { synced: flushed, flushed, failed, remaining: remaining.length };
}
