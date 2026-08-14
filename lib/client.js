window.__ModuleLoader__.load({
  id: "dsh-archived-sessions",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");

    if (typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent = [
        ".dsh-archived{display:flex;flex-direction:column;gap:12px;padding:4px 0}",
        ".dsh-archived-head{display:flex;align-items:center;justify-content:space-between;gap:12px}",
        ".dsh-archived-count{color:var(--dsw-alias-label-secondary);font-size:13px}",
        ".dsh-archived-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}",
        ".dsh-archived-item-main{min-width:0;display:flex;flex-direction:column;gap:3px}",
        ".dsh-archived-title{font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        ".dsh-archived-meta{font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        ".dsh-archived-id{font-size:11px;color:var(--dsw-alias-label-secondary);opacity:.75;font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        ".dsh-archived-actions{display:flex;gap:8px;flex:none}",
        ".dsh-archived-btn{flex:none;padding:6px 14px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer}",
        ".dsh-archived-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}",
        ".dsh-archived-btn:disabled{opacity:.5;cursor:default}",
        ".dsh-archived-restore{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}",
        ".dsh-archived-delete{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}",
        ".dsh-archived-delete-confirm{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-bg-base)}",
        ".dsh-archived-empty{color:var(--dsw-alias-label-secondary);font-size:13px;padding:8px 0}",
        ".dsh-archived-error{color:var(--dsw-alias-state-error-primary);font-size:13px}",
        ".dsh-archived-notice{color:var(--dsw-alias-state-success-primary);font-size:13px}"
      ].join("");
      document.head.append(style);
    }

    const idCodec = {
      mode: "strict",
      typeSymbol: "SessionId",
      schema: {
        parse(value) {
          if (typeof value !== "string" || value.length === 0) throw new Error("session id must be a non-empty string");
          return value;
        }
      }
    };
    const passthrough = {
      mode: "strict",
      typeSymbol: "Json",
      schema: { parse(value) { return value; } }
    };

    const TYPERT_REMOTE = {
      package: "dsh-archived-sessions",
      descriptors: [
        { id: "dsh-archived-sessions#archivedSessions/list", service: "archivedSessions", namespace: "archivedSessions", method: "list", invocation: { kind: "direct" }, parameters: [], result: passthrough },
        { id: "dsh-archived-sessions#archivedSessions/restore", service: "archivedSessions", namespace: "archivedSessions", method: "restore", invocation: { kind: "direct" }, parameters: [{ name: "id", wire: "id", source: "json", codec: idCodec }], result: passthrough },
        { id: "dsh-archived-sessions#archivedSessions/removeSession", service: "archivedSessions", namespace: "archivedSessions", method: "removeSession", invocation: { kind: "direct" }, parameters: [{ name: "id", wire: "id", source: "json", codec: idCodec }], result: passthrough }
      ]
    };

    function ArchivedSessions(props) {
      const remote = props.remote;
      const [items, setItems] = react.useState(null);
      const [error, setError] = react.useState(null);
      const [notice, setNotice] = react.useState(null);
      const [busyId, setBusyId] = react.useState(null);
      const [confirmId, setConfirmId] = react.useState(null);

      const refresh = () => {
        setError(null);
        setNotice(null);
        setConfirmId(null);
        remote.list().then(
          (res) => { setItems(res && res.ok ? ((res.value && res.value.items) || []) : []); },
          (err) => { setItems([]); setError(err && err.message ? err.message : String(err)); }
        );
      };

      react.useEffect(() => { refresh(); }, []);

      const restore = (id) => {
        setBusyId(id);
        setError(null);
        setNotice(null);
        remote.restore(id).then(
          (res) => {
            setBusyId(null);
            if (res && res.ok) { setItems((prev) => (prev || []).filter((it) => it.id !== id)); setNotice("已恢复会话"); }
            else setError(res && res.error ? String(res.error) : "restore failed");
          },
          (err) => { setBusyId(null); setError(err && err.message ? err.message : String(err)); }
        );
      };

      const removeSession = (id) => {
        setBusyId(id);
        setError(null);
        setNotice(null);
        setConfirmId(null);
        remote.removeSession(id).then(
          (res) => {
            setBusyId(null);
            if (res && res.ok) {
              setItems((prev) => (prev || []).filter((it) => it.id !== id));
              setNotice(res.value && res.value.fileDeleted ? "已彻底删除（含本地日志）" : "已从归档和工作区移除");
            } else setError(res && res.error ? String(res.error) : "remove failed");
          },
          (err) => { setBusyId(null); setError(err && err.message ? err.message : String(err)); }
        );
      };

      const el = react.createElement;

      if (error) return el("div", { className: "dsh-archived" }, el("div", { className: "dsh-archived-error" }, String(error)), el("button", { className: "dsh-archived-btn", onClick: refresh }, "重试"));
      if (items === null) return el("div", { className: "dsh-archived-empty" }, "加载中…");

      return el("div", { className: "dsh-archived" },
        el("div", { className: "dsh-archived-head" },
          el("span", { className: "dsh-archived-count" }, "已归档 " + items.length + " 个会话"),
          el("button", { className: "dsh-archived-btn", onClick: refresh }, "刷新")
        ),
        notice ? el("div", { className: "dsh-archived-notice" }, notice) : null,
        items.length === 0
          ? el("div", { className: "dsh-archived-empty" }, "没有已归档的会话。")
          : items.map((it) => el("div", { key: it.id, className: "dsh-archived-item" },
              el("div", { className: "dsh-archived-item-main" },
                el("div", { className: "dsh-archived-title" }, it.title || "(未命名会话)"),
                el("div", { className: "dsh-archived-meta" }, (it.workspaceTitle ? it.workspaceTitle + " · " : "") + it.workspacePath),
                el("div", { className: "dsh-archived-id" }, it.id)
              ),
              el("div", { className: "dsh-archived-actions" },
                el("button", { className: "dsh-archived-btn dsh-archived-restore", disabled: busyId !== null, onClick: () => restore(it.id) }, busyId === it.id ? "恢复中…" : "恢复"),
                el("button", { className: "dsh-archived-btn dsh-archived-delete" + (confirmId === it.id ? " dsh-archived-delete-confirm" : ""), disabled: busyId !== null, onClick: () => { if (confirmId === it.id) removeSession(it.id); else setConfirmId(it.id); } }, busyId === it.id ? "删除中…" : (confirmId === it.id ? "确认删除？" : "彻底删除"))
              )
            ))
      );
    }

    const inject = ["remote", "slots"];
    async function apply(ctx) {
      await ctx.remote.$mount(TYPERT_REMOTE);
      const archivedRemote = ctx.get("remote.archivedSessions");
      ctx.slots.inject("settings.section", () => ctx.slots.register(
        { name: "settings.section", id: "archived-sessions", order: 25, label: "已归档会话" },
        () => react.createElement(ArchivedSessions, { remote: archivedRemote })
      ));
    }
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
