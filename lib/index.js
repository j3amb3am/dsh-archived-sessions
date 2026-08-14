import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { rm } from "node:fs/promises";

/**
 * Apply the `Remote` method decorator by hand: the shipped decorator uses the
 * TC39 stage-3 decorator context (`addInitializer`), which plain JS cannot
 * produce at the call site. We build that context ourselves, capture the
 * initializer, and run it against each service instance so `remoteMethods()`
 * (read by the Typert gateway's SRC discovery) sees the markers.
 */
function remoteInitializersFor(methods) {
  const initializers = [];
  for (const method of methods) {
    const decorator = Remote(method);
    decorator(null, {
      kind: "method",
      name: method,
      static: false,
      private: false,
      addInitializer(fn) {
        initializers.push(fn);
      },
    });
  }
  return initializers;
}

const REMOTE_INIT = remoteInitializersFor(["list", "restore", "removeSession"]);

class ArchivedSessionsService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, "archivedSessions");
    for (const fn of REMOTE_INIT) fn.call(this);
  }

  readArchivedIds() {
    const ids = this.ctx.workspaceRegistry.archivedSessionIds;
    return Array.isArray(ids) ? ids.map((id) => String(id)) : [];
  }

  workspaceOf(id) {
    for (const ws of this.ctx.workspaceRegistry.list()) {
      if (Array.isArray(ws.sessionIds) && ws.sessionIds.map((s) => String(s)).indexOf(id) !== -1) {
        return { title: String(ws.title || ""), path: String(ws.path || "") };
      }
    }
    return { title: "", path: "" };
  }

  async list() {
    const ids = this.readArchivedIds();
    const titles = {};
    if (ids.length > 0) {
      try {
        const results = await this.ctx.sessionQuery.readTitleSnapshots(ids);
        for (const r of results) {
          if (r && r.status === "fulfilled" && r.value && r.value.title && r.value.title.title) {
            titles[String(r.sessionId)] = String(r.value.title.title);
          }
        }
      } catch {}
    }
    const items = ids.map((id) => {
      const owner = this.workspaceOf(id);
      return {
        id,
        title: titles[id] || "",
        workspaceTitle: owner.title,
        workspacePath: owner.path,
      };
    });
    return { items };
  }

  async restore(id) {
    const sid = String(id);
    if (!sid) return { ok: false, error: "missing session id" };
    const registry = this.ctx.workspaceRegistry;
    const ids = this.readArchivedIds();
    if (ids.indexOf(sid) === -1) return { ok: false, error: "session is not archived" };
    if (typeof registry.setState !== "function" || registry.state === undefined) {
      return { ok: false, error: "workspace registry internal API unavailable" };
    }
    await registry.setState({ ...registry.state, archivedSessionIds: ids.filter((x) => x !== sid) });
    return { ok: true };
  }

  async removeSession(id) {
    const sid = String(id);
    if (!sid) return { ok: false, error: "missing session id" };
    const registry = this.ctx.workspaceRegistry;

    let location = null;
    try {
      const persistence = this.ctx.sessionPersistence;
      if (persistence && typeof persistence.locate === "function") {
        const headers = await persistence.list();
        const header = headers.find((h) => String(h.id) === sid);
        if (header !== undefined) location = persistence.locate(header);
      }
    } catch {}

    const ids = this.readArchivedIds();
    if (ids.indexOf(sid) !== -1 && typeof registry.setState === "function" && registry.state !== undefined) {
      await registry.setState({ ...registry.state, archivedSessionIds: ids.filter((x) => x !== sid) });
    }

    for (const ws of registry.list()) {
      const sids = Array.isArray(ws.sessionIds) ? ws.sessionIds.map((s) => String(s)) : [];
      if (sids.indexOf(sid) !== -1 && typeof ws.detachSession === "function") {
        await ws.detachSession(sid);
      }
    }

    let fileDeleted = false;
    if (location && location.path) {
      try {
        await rm(location.path, { force: true });
        fileDeleted = true;
      } catch {}
    }

    return { ok: true, fileDeleted };
  }
}

const name = "archived-sessions-manager";
const inject = ["workspaceRegistry", "sessionQuery", "sessionPersistence"];

function apply(ctx) {
  new ArchivedSessionsService(ctx);
}

export { name, inject, apply };
