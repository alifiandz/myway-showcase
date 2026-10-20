import test from "node:test";
import assert from "node:assert/strict";
import { startAccountSync, readPlanning } from "../src/account-sync.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
function browser(user) {
  const storage = new MemoryStorage(); storage.setItem("myway-active-user-id", user);
  const timers = [];
  return { localStorage: storage, timers, setInterval(fn) { timers.push(fn); return timers.length; }, clearInterval() {}, addEventListener() {}, removeEventListener() {} };
}
function client(db, user) {
  return {
    from() { return { select() { return { eq(_column, id) { return { async maybeSingle() { return { data: id === user ? db.get(user) ?? null : null, error: null }; } }; } }; } }; },
    async rpc(_name, { payload, expected_revision }) {
      const existing = db.get(user);
      if ((existing?.revision ?? 0) !== expected_revision) return { data: [], error: null };
      const row = { data: structuredClone(payload), revision: expected_revision + 1 }; db.set(user, row);
      return { data: [row], error: null };
    },
  };
}
const callbacks = () => ({ ready() {}, changed() {}, conflict() {}, status() {} });

test("planning moves from first browser to second browser and refreshes remote changes", async () => {
  const original = globalThis.window; const db = new Map(); const a = browser("user-a"), b = browser("user-a");
  try {
    globalThis.window = a; a.localStorage.setItem("myway-pathway-selection", '[{"id":"school:skema","role":"Dream"}]');
    a.localStorage.setItem("myway-profile-documents", JSON.stringify({transcript:"transcript.pdf",english:"ielts.pdf"}));
    a.localStorage.setItem("myway-document-links", JSON.stringify({transcript:"https://example.com/transcript"}));
    await startAccountSync(client(db,"user-a"),"user-a",callbacks());
    globalThis.window = b; await startAccountSync(client(db,"user-a"),"user-a",callbacks());
    assert.equal(b.localStorage.getItem("myway-pathway-selection"), a.localStorage.getItem("myway-pathway-selection"));
    a.localStorage.setItem("myway-saved", '["skema"]');
    globalThis.window = a; await a.timers[0]();
    globalThis.window = b; await b.timers[0]();
    assert.equal(b.localStorage.getItem("myway-saved"), '["skema"]');
    assert.equal(db.get("user-a").revision,2);
    assert.equal(b.localStorage.getItem("myway-profile-documents"), a.localStorage.getItem("myway-profile-documents"));
    assert.equal(b.localStorage.getItem("myway-document-links"), a.localStorage.getItem("myway-document-links"));
  } finally { globalThis.window = original; }
});

test("conflicting legacy data is preserved and waits for an explicit choice", async () => {
  const original = globalThis.window; const b = browser("user-a");
  const cloud = {"myway-pathway-selection": '[{"id":"escp","role":"Dream"}]'};
  const db = new Map([["user-a", {data:cloud, revision:1}]]); let conflict;
  try {
    globalThis.window=b; b.localStorage.setItem("myway-pathway-selection", '[{"id":"skema","role":"Dream"}]'); b.localStorage.setItem("myway-onboarding-v1","complete");
    const local=readPlanning(b.localStorage);
    await startAccountSync(client(db,"user-a"),"user-a",{...callbacks(),conflict(value){conflict=value;}});
    assert.deepEqual(conflict.local,local); assert.deepEqual(db.get("user-a").data,cloud);
    assert.equal(b.timers.length,0);
    await startAccountSync(client(db,"user-a"),"user-a",callbacks(),"remote");
    assert.deepEqual(readPlanning(b.localStorage),cloud);
    assert.ok([...b.localStorage.values.keys()].some(key=>key.startsWith("myway-sync-backup:user-a:")));
  } finally { globalThis.window=original; }
});

test("stale browser cannot silently overwrite a newer account revision", async () => {
  const original=globalThis.window; const b=browser("user-a"); const db=new Map(); let conflict;
  try {
    globalThis.window=b; await startAccountSync(client(db,"user-a"),"user-a",{...callbacks(),conflict(value){conflict=value;}});
    b.localStorage.setItem("myway-saved",'["local"]');
    db.set("user-a",{data:{"myway-saved":'["remote"]'},revision:2});
    await b.timers[0]();
    assert.equal(db.get("user-a").data["myway-saved"],'["remote"]');
    assert.equal(conflict.local["myway-saved"],'["local"]');
  } finally { globalThis.window=original; }
});
