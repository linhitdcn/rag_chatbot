/*
 * KnowledgeDesk widget loader.
 *   <script src="https://YOUR_APP/widget.js" data-bot-id="bt_xxxxxxxx" defer></script>
 * Fetches the bot's appearance, then injects a launcher button and a chat iframe. No dependencies.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var botId = script.getAttribute("data-bot-id");
  if (!botId || window.__kdWidgetLoaded === botId) return;
  window.__kdWidgetLoaded = botId;

  var origin = new URL(script.src, location.href).origin;
  var ICONS = {
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>'
  };
  var CLOSE = '<path d="M18 6 6 18M6 6l12 12"/>';

  function svg(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }

  function mount(cfg) {
    var side = cfg.position === "left" ? "left" : "right";
    var color = /^#[0-9a-fA-F]{6}$/.test(cfg.color) ? cfg.color : "#4f46e5";
    var open = false;

    var frame = document.createElement("iframe");
    frame.src = origin + "/embed/" + encodeURIComponent(botId);
    frame.title = cfg.title || "Chat";
    frame.setAttribute("referrerpolicy", "origin"); // lets the server check the parent domain against the allow-list
    frame.setAttribute("loading", "lazy");
    frame.style.cssText = "position:fixed;bottom:92px;" + side + ":20px;width:380px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100vh - 112px);" +
      "border:0;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);background:#fff;z-index:2147483000;display:none;color-scheme:normal;";

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Open chat");
    button.setAttribute("aria-expanded", "false");
    button.style.cssText = "position:fixed;bottom:20px;" + side + ":20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
      "background:" + color + ";box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483001;padding:0;";
    button.innerHTML = svg(ICONS[cfg.icon] || ICONS.chat);

    function setOpen(next) {
      open = next;
      frame.style.display = open ? "block" : "none";
      button.innerHTML = svg(open ? CLOSE : ICONS[cfg.icon] || ICONS.chat);
      button.setAttribute("aria-label", open ? "Close chat" : "Open chat");
      button.setAttribute("aria-expanded", String(open));
      applyMobile();
    }
    // Small screens: the chat takes over the viewport.
    function applyMobile() {
      var small = window.innerWidth < 480;
      if (open && small) {
        frame.style.cssText += "inset:0;bottom:0;left:0;right:0;width:100vw;max-width:100vw;height:100%;max-height:100%;border-radius:0;";
        button.style.display = "none";
      } else {
        frame.style.width = "380px"; frame.style.maxWidth = "calc(100vw - 24px)"; frame.style.height = "600px"; frame.style.maxHeight = "calc(100vh - 112px)";
        frame.style.borderRadius = "16px"; frame.style.bottom = "92px"; frame.style[side] = "20px";
        frame.style[side === "left" ? "right" : "left"] = "auto"; frame.style.top = "auto";
        button.style.display = "flex";
      }
    }

    button.addEventListener("click", function () { setOpen(!open); });
    window.addEventListener("resize", applyMobile);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { setOpen(false); button.focus(); } });
    window.addEventListener("message", function (e) {
      if (e.origin === origin && e.source === frame.contentWindow && e.data && e.data.type === "kd:close") setOpen(false);
    });

    document.body.appendChild(frame);
    document.body.appendChild(button);
  }

  fetch(origin + "/api/widget/" + encodeURIComponent(botId))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) { if (cfg) mount(cfg); })
    .catch(function () { /* the widget silently stays hidden if the config can't be loaded */ });
})();
