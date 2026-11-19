(function () {
  "use strict";
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;

  let hadController = Boolean(navigator.serviceWorker.controller);
  let notified = false;

  function showUpdateNotice() {
    if (notified) return;
    notified = true;
    const lang = document.documentElement.lang;
    const text = {
      en: ["A new version of this website is available.", "Refresh", "Dismiss"],
      pt: ["Está disponível uma nova versão deste website.", "Atualizar", "Fechar"],
      fr: ["Une nouvelle version de ce site est disponible.", "Actualiser", "Fermer"],
      ja: ["ウェブサイトの新しいバージョンがあります。", "更新", "閉じる"]
    }[lang] || ["A new version of this website is available.", "Refresh", "Dismiss"];

    const notice = document.createElement("aside");
    notice.className = "site-update-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    const message = document.createElement("p");
    message.textContent = text[0];
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.textContent = text[1];
    refresh.addEventListener("click", () => location.reload());
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = text[2];
    dismiss.setAttribute("aria-label", text[2]);
    dismiss.addEventListener("click", () => notice.remove());
    notice.append(message, refresh, dismiss);
    document.body.appendChild(notice);
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    showUpdateNotice();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(error => {
      console.warn("Service worker registration failed", error);
    });
  });
})();
