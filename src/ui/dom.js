(function (S) {
  "use strict";
  var U = S.UI;
  U.el = function (id) { return document.getElementById(id); };
  U.escape = function (value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]; });
  };
  U.eventModalOpen = false;
  U.modalReturnFocus = null;
  U.openModal = function (html, options) {
    options = options || {};
    var content = U.el("modalContent"), backdrop = U.el("modalBackdrop"), modal = backdrop && backdrop.querySelector ? backdrop.querySelector(".modal") : null;
    U.modalReturnFocus = document.activeElement && document.activeElement.focus ? document.activeElement : null;
    content.innerHTML = html;
    var heading = content.querySelector ? content.querySelector("h1,h2,h3") : null, headingId = options.labelledBy || "modalHeading";
    if (heading && !heading.id) heading.id = headingId;
    backdrop.classList.remove("hidden");
    if (document.body && document.body.classList) document.body.classList.add("modal-open");
    U.eventModalOpen = Boolean(options.event);
    if (modal && modal.setAttribute) {
      modal.className = "modal" + (options.modalClass ? " " + options.modalClass : "");
      modal.setAttribute("aria-labelledby", headingId);
      modal.setAttribute("tabindex", "-1");
    }
    var focusable = content.querySelector('button:not([disabled]),select:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if (focusable && focusable.focus) focusable.focus(); else if (modal && modal.focus) modal.focus();
  };
  U.closeModal = function (force) {
    if (!force && U.eventModalOpen && S.State.current && S.Systems.Event.hasBlockingEvent(S.State.current)) return false;
    U.el("modalBackdrop").classList.add("hidden");
    if (document.body && document.body.classList) document.body.classList.remove("modal-open");
    U.eventModalOpen = false;
    if (U.modalReturnFocus && U.modalReturnFocus.focus) U.modalReturnFocus.focus();
    U.modalReturnFocus = null;
    if (!force && S.State.current && S.Systems.Event.hasBlockingEvent(S.State.current) && U.showActiveEvent) U.showActiveEvent();
    return true;
  };
  U.handleModalKeydown = function (event) {
    var backdrop = U.el("modalBackdrop"), content = U.el("modalContent");
    if (!backdrop || backdrop.classList.contains("hidden") || event.key !== "Tab" || !content.querySelectorAll) return false;
    var focusable = Array.prototype.slice.call(content.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return false;
    var first = focusable[0], last = focusable[focusable.length - 1], current = document.activeElement;
    if (event.shiftKey && current === first) { event.preventDefault(); last.focus(); return true; }
    if (!event.shiftKey && current === last) { event.preventDefault(); first.focus(); return true; }
    return false;
  };
  U.notify = function (message, type) {
    var toast = U.el("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast show" + (type === "error" ? " error" : "");
    clearTimeout(U.notify.timer);
    U.notify.timer = setTimeout(function () { toast.className = "toast"; }, 2200);
  };
  U.commit = function (result, options) {
    options = options || {};
    if (!result || !result.ok) {
      U.notify(result && result.errors ? result.errors.join(" / ") : "処理に失敗しました", "error");
      return false;
    }
    if (result.messages && result.messages.length) U.notify(result.messages[0]);
    if (options.autosave !== false && S.State.current && S.State.current.settings.autosave) {
      var saved = S.Save.autosave(S.State.current);
      if (!saved.ok) {
        if (saved.code === "validation_failed" && S.Save.restoreRuntimeCheckpoint) {
          var recovered = S.Save.restoreRuntimeCheckpoint();
          U.notify(recovered.ok ? "不正な状態を検出し、直前の正常状態へ復旧しました。" : saved.errors.join(" / "), "error");
        } else U.notify(saved.errors.join(" / "), "error");
      }
    }
    if (options.render !== false && U.renderApp) U.renderApp();
    return true;
  };
  U.showTitle = function () {
    if (document.body && document.body.classList) document.body.classList.remove("game-active");
    U.el("gameScreen").classList.remove("active");
    U.el("titleScreen").classList.add("active");
    U.el("continueButton").disabled = !S.Save.exists("autosave");
  };
  U.showGame = function () {
    if (document.body && document.body.classList) document.body.classList.add("game-active");
    U.el("titleScreen").classList.remove("active");
    U.el("gameScreen").classList.add("active");
    if (U.updateMobileCampaignMode) U.updateMobileCampaignMode();
    U.renderApp();
  };
})(window.Sengoku);
