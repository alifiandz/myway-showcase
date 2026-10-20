import type { SupabaseClient } from "@supabase/supabase-js";

export const SYNC_KEYS = ["myway-onboarding-v1", "alif-pathway-business-v1", "myway-profile", "myway-profile-documents", "myway-document-links", "myway-preference-priorities", "myway-saved", "myway-compared", "myway-pathway-selection", "myway-pathway-actions", "myway-pathway-records", "myway-routines", "myway-habit-checks", "myway-notifications-enabled", "myway-product-tour-v2", "myway-profile-avatar", "myway-language"];
export type PlanningData = Record<string, string>;
type Row = { data: PlanningData; revision: number };
export type SyncConflict = { local: PlanningData; remote: Row };
export function readPlanning(storage: Storage): PlanningData {
  return Object.fromEntries(SYNC_KEYS.flatMap(key => { const value = storage.getItem(key); return value === null ? [] : [[key, value]]; }));
}
export function samePlanning(a: PlanningData, b: PlanningData) {
  return SYNC_KEYS.every(key => a[key] === b[key]);
}
export function applyPlanning(storage: Storage, data: PlanningData) {
  for (const key of SYNC_KEYS) { if (typeof data[key] === "string") storage.setItem(key, data[key]); else storage.removeItem(key); }
}

export async function startAccountSync(client: SupabaseClient, userId: string, callbacks: {
  ready: () => void; changed: () => void; conflict: (value: SyncConflict) => void; status: (value: string) => void;
}, choice?: "local" | "remote", isActive: () => boolean = () => true) {
  const storage = window.localStorage;
  const baseKey = `myway-sync-base:${userId}`;
  const backupKey = `myway-sync-backup:${userId}`;
  let stopped = false, busy = false;
  let baseline = readPlanning(storage);
  let revision = 0;
  const active = () => !stopped && isActive() && storage.getItem("myway-active-user-id") === userId;
  const readRemote = async (): Promise<Row | null> => {
    const { data, error } = await client.from("account_planning_state").select("data,revision").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data as Row | null;
  };
  const remember = () => storage.setItem(baseKey, JSON.stringify({ data: baseline, revision }));
  const backup = (data: PlanningData) => {
    storage.setItem(`${backupKey}:${Date.now()}`, JSON.stringify(data));
    storage.setItem(backupKey, JSON.stringify(data));
  };
  const save = async (data: PlanningData, expected: number): Promise<Row | null> => {
    const result = await client.rpc("save_account_planning_state", { payload: data, expected_revision: expected });
    if (result.error) throw result.error;
    return result.data?.[0] as Row | null;
  };
  const remote = await readRemote();
  if (!active()) return () => {};
  let known: Row | null = null;
  try { known = JSON.parse(storage.getItem(baseKey) || "null"); } catch {}
  if (remote && !samePlanning(baseline, remote.data)) {
    const localChanged = known ? !samePlanning(baseline, known.data) : Object.keys(baseline).length > 1;
    if (localChanged && !choice && (!known || known.revision !== remote.revision)) {
      backup(baseline); callbacks.conflict({ local: baseline, remote }); return () => {};
    }
    if (choice === "local" || (localChanged && known?.revision === remote.revision && choice !== "remote")) {
      backup(remote.data);
      const saved = await save(baseline, remote.revision);
      if (!saved) throw new Error("Account changed in another browser. Retry to choose the latest version.");
      revision = saved.revision;
    } else {
      backup(baseline); baseline = remote.data; revision = remote.revision;
      if (!active()) return () => {};
      applyPlanning(storage, baseline);
    }
  } else if (remote) revision = remote.revision;
  else {
    backup(baseline);
    const saved = await save(baseline, 0);
    if (!saved) throw new Error("Account initialized in another browser. Retry to load it.");
    revision = saved.revision;
  }
  if (!active()) return () => {};
  remember(); callbacks.ready(); callbacks.status("Saved to account");
  const tick = async () => {
    if (!active() || busy) return;
    busy = true;
    try {
      const local = readPlanning(storage);
      if (!samePlanning(local, baseline)) {
        callbacks.status("Saving to account…");
        const saved = await save(local, revision);
        if (!active()) return;
        if (!saved) {
          const latest = await readRemote();
          if (latest) { backup(local); stopped = true; callbacks.conflict({ local, remote: latest }); }
          return;
        }
        baseline = local; revision = saved.revision; remember();
      } else {
        const latest = await readRemote();
        if (!active()) return;
        // A user may edit while the remote request is in flight: preserve that edit.
        if (latest && latest.revision !== revision && samePlanning(readPlanning(storage), baseline)) {
          baseline = latest.data; revision = latest.revision; applyPlanning(storage, baseline); remember(); callbacks.changed();
        }
      }
      callbacks.status("Saved to account");
    } catch { if (active()) callbacks.status("Sync paused · your changes are kept on this device"); }
    finally { busy = false; }
  };
  const interval = window.setInterval(tick, 2000);
  window.addEventListener("focus", tick);
  return () => { stopped = true; window.clearInterval(interval); window.removeEventListener("focus", tick); };
}
