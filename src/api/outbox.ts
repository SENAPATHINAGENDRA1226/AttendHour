import { api } from "./client";
import { MarkStatus, SessionStatus } from "../types";

export interface OutboxPayload {
  section_id: number;
  subject_id: number;
  date: string;
  period_numbers: number[];
  status: SessionStatus;
  remarks?: string | null;
  marks: { student_id: number; status: MarkStatus }[];
  per_period_overrides: Record<number, { student_id: number; status: MarkStatus }[]>;
  section_name?: string;
  subject_name?: string;
}

export interface OutboxItem {
  id: string;
  timestamp: number;
  payload: OutboxPayload;
  status: "pending" | "conflict";
  conflictDetails?: string;
}

const DB_NAME = "hourlogix_offline_db";
const STORE_NAME = "attendance_outbox";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this browser environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function notifyOutboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("outbox-changed"));
  }
}

export async function saveToOutbox(payload: OutboxPayload): Promise<OutboxItem> {
  const db = await openDB();
  const id = `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const item: OutboxItem = {
    id,
    timestamp: Date.now(),
    payload,
    status: "pending",
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => {
      notifyOutboxChanged();
      resolve(item);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: OutboxItem[] = req.result || [];
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOutboxItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      notifyOutboxChanged();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeOutboxForSession(
  sectionId: number,
  date: string,
  periodNumbers: number[]
): Promise<void> {
  const items = await getOutboxItems();
  const matching = items.filter(
    (item) =>
      item.payload.section_id === sectionId &&
      item.payload.date === date &&
      item.payload.period_numbers.some((p) => periodNumbers.includes(p))
  );

  for (const item of matching) {
    await removeOutboxItem(item.id);
  }
}

export async function updateOutboxItemStatus(
  id: string,
  status: "pending" | "conflict",
  conflictDetails?: string
): Promise<void> {
  const db = await openDB();
  const items = await getOutboxItems();
  const target = items.find((i) => i.id === id);
  if (!target) return;

  target.status = status;
  if (conflictDetails !== undefined) {
    target.conflictDetails = conflictDetails;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(target);
    req.onsuccess = () => {
      notifyOutboxChanged();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

function checkDataConflict(payload: OutboxPayload, periodNumber: number, serverSession: any): boolean {
  if (!serverSession) return false;
  if (serverSession.status !== payload.status) return true;
  if ((serverSession.remarks || "") !== (payload.remarks || "")) return true;

  const periodMarks = payload.per_period_overrides?.[periodNumber] || payload.marks;
  if (!periodMarks || periodMarks.length === 0) return false;

  const serverRecordMap = new Map<number, string>();
  (serverSession.records || []).forEach((r: any) => {
    serverRecordMap.set(r.student_id, r.status);
  });

  for (const m of periodMarks) {
    const serverStatus = serverRecordMap.get(m.student_id);
    if (serverStatus && serverStatus !== m.status) {
      return true;
    }
  }

  return false;
}

let isSyncing = false;

export async function syncOutbox(): Promise<{ synced: number; conflicts: number; remaining: number }> {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { synced: 0, conflicts: 0, remaining: (await getOutboxItems()).length };
  }

  isSyncing = true;
  let synced = 0;
  let conflicts = 0;

  try {
    const items = await getOutboxItems();
    for (const item of items) {
      if (item.status === "conflict") {
        conflicts++;
        continue;
      }

      // Pre-check for session conflict on server for each period
      let hasConflict = false;
      for (const periodNumber of item.payload.period_numbers) {
        try {
          const res = await api.get("/faculty/attendance/session", {
            params: {
              section_id: item.payload.section_id,
              date: item.payload.date,
              period_number: periodNumber,
            },
          });
          if (res.data && checkDataConflict(item.payload, periodNumber, res.data)) {
            hasConflict = true;
            break;
          }
        } catch {
          /* if check fails, attempt normal post */
        }
      }

      if (hasConflict) {
        await updateOutboxItemStatus(
          item.id,
          "conflict",
          "Session data on server was updated and differs from your offline submission."
        );
        conflicts++;
        continue;
      }

      // Replay request
      try {
        await api.post("/faculty/attendance/post", {
          section_id: item.payload.section_id,
          subject_id: item.payload.subject_id,
          date: item.payload.date,
          period_numbers: item.payload.period_numbers,
          status: item.payload.status,
          marks: item.payload.marks || [],
          remarks: item.payload.remarks || null,
          per_period_overrides: item.payload.per_period_overrides || {},
        });

        await removeOutboxItem(item.id);
        synced++;
      } catch (err: any) {
        if (!err?.response) {
          // Network failure: stop replay
          break;
        } else if (err?.response?.status === 409 || err?.response?.status === 400) {
          await updateOutboxItemStatus(
            item.id,
            "conflict",
            err?.response?.data?.detail || "Server rejected offline submission due to conflict."
          );
          conflicts++;
        }
      }
    }

    const remainingItems = await getOutboxItems();
    return { synced, conflicts, remaining: remainingItems.length };
  } finally {
    isSyncing = false;
  }
}

export function initOutboxSync() {
  if (typeof window === "undefined") return;

  const handleConnectivityChange = () => {
    if (navigator.onLine) {
      syncOutbox();
    }
  };

  window.addEventListener("online", handleConnectivityChange);
  window.addEventListener("focus", handleConnectivityChange);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleConnectivityChange();
    }
  });

  if (navigator.onLine) {
    syncOutbox();
  }
}
