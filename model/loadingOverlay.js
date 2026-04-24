const loadingOverlayConfig = {
  gifUrl:
    "https://cdn.pixabay.com/animation/2023/11/09/03/05/03-05-45-320_512.gif"
};

let pendingCount = 0;
let overlayElement = null;

function injectStyles() {
  if (document.getElementById("global-loading-overlay-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "global-loading-overlay-style";
  style.textContent = `
    body.global-loading-active {
      overflow: hidden;
    }

    .global-loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(120, 120, 120, 0.58);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.2s ease, visibility 0.2s ease;
      z-index: 99999;
    }

    .global-loading-overlay.is-visible {
      opacity: 1;
      visibility: visible;
      pointer-events: all;
    }

    .global-loading-overlay__content {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 132px;
      height: 132px;
      background: rgba(255, 255, 255, 0.18);
      border-radius: 16px;
      padding: 16px;
      box-sizing: border-box;
    }

    .global-loading-overlay__content img {
      width: 96px;
      height: 96px;
      object-fit: contain;
      display: block;
    }
  `;

  document.head.appendChild(style);
}

function ensureOverlay() {
  if (typeof document === "undefined") {
    return null;
  }

  if (overlayElement && document.body.contains(overlayElement)) {
    return overlayElement;
  }

  if (!document.body) {
    return null;
  }

  injectStyles();

  overlayElement = document.getElementById("global-loading-overlay");
  if (overlayElement) {
    return overlayElement;
  }

  overlayElement = document.createElement("div");
  overlayElement.id = "global-loading-overlay";
  overlayElement.className = "global-loading-overlay";
  overlayElement.innerHTML = `
    <div class="global-loading-overlay__content" aria-live="polite" aria-busy="true">
      <img src="${loadingOverlayConfig.gifUrl}" alt="Carregando">
    </div>
  `;

  document.body.appendChild(overlayElement);
  return overlayElement;
}

function syncOverlayState() {
  if (typeof document === "undefined") {
    return;
  }

  const overlay = ensureOverlay();
  if (!overlay) {
    return;
  }

  const isVisible = pendingCount > 0;
  overlay.classList.toggle("is-visible", isVisible);
  document.body.classList.toggle("global-loading-active", isVisible);
}

export function beginGlobalLoading() {
  pendingCount += 1;
  syncOverlayState();
}

export function endGlobalLoading() {
  pendingCount = Math.max(0, pendingCount - 1);
  syncOverlayState();
}

export function initGlobalLoadingOverlay() {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.__globalLoadingOverlayReady) {
    window.__globalLoadingOverlayReady = true;

    const mount = () => {
      ensureOverlay();
      syncOverlayState();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
    } else {
      mount();
    }
  }

  if (!window.__globalLoadingFetchWrapped && typeof window.fetch === "function") {
    window.__globalLoadingFetchWrapped = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      beginGlobalLoading();
      try {
        return await originalFetch(...args);
      } finally {
        endGlobalLoading();
      }
    };
  }
}

export { loadingOverlayConfig };
