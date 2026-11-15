/*
 * Behaviour partagé : marges sous le header fixé, footer, timeline au scroll,
 * navigation clavier des cartes, compact du menu desktop, lazy-loading images.
 *
 * Aligné avec js/layout.js : même détection des URLs « nested » (/projects/, etc.).
 */

"use strict";

/** Garde-fous viewport : alignés sur le CSS (timeline, header). */
const MOBILE_MEDIA = "(max-width: 1023px)";
const DESKTOP_LAYOUT_MEDIA = "(min-width: 1024px)";

/**
 * Pages détail : chemins sous /projects/, /experiences/, /blogpost/ (fichiers HTML).
 * Synchronisé avec `PATH_DETAIL_SECTION_RE` dans layout.js.
 */
const PATH_DETAIL_SECTION_RE = /\/(projects|experiences|blogpost)\//;

const MENU_COMPACT_SCROLL_PX = 180;
const HEADER_MARKER_POINT_TOP = MENU_COMPACT_SCROLL_PX + 1;

/** Offset au scroll après clic sur une vignette de galerie (#pictures). */
const GALLERY_SCROLL_FOCUS_OFFSET_PX = 75;

const getPathname = function () {
    try {
        return window.location.pathname || "";
    } catch (e) {
        return "";
    }
};

const isDetailSectionPath = function () {
    return PATH_DETAIL_SECTION_RE.test(getPathname());
};

const prefersReducedMotion = function () {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
        return false;
    }
};

const isMobile = function () {
    if (window.matchMedia(MOBILE_MEDIA).matches) return true;
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
        ua
    );
};

/** Desktop pour le header compact : viewport uniquement (matchMedia + repli largeur). */
const isDesktopHeaderLayout = function () {
    try {
        return window.matchMedia(DESKTOP_LAYOUT_MEDIA).matches;
    } catch (e) {
        return window.innerWidth >= 1024;
    }
};

const getCurrentPage = function () {
    const path = getPathname();
    const segment = path.substring(path.lastIndexOf("/") + 1);
    return segment || "index.html";
};

const checkFooterPosition = function () {
    const footer = document.getElementById("footer");
    if (!footer) return;
    footer.style.position = document.body.scrollHeight >= document.body.clientHeight ? "initial" : "absolute";
};

const isInViewport = function (element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
};

const animateTimelineBlocks = function () {
    if (isMobile()) return;
    document.querySelectorAll(".block").forEach(function (block) {
        const isLeft = block.classList.contains("blockleft");
        const visible = isInViewport(block);
        /* Garder le hover split (transform) + l’animation au scroll (margin) — le shorthand CSS est écrasé par cette ligne */
        block.style.transition =
            "margin 0.5s ease, transform var(--timeline-split-duration) var(--timeline-split-ease)";
        if (visible) {
            block.classList.add("inside");
            block.style.margin = isLeft ? "0 0 0 20%" : "0 20% 0 0";
        } else {
            block.classList.remove("inside");
            block.style.margin = isLeft ? "0 0 0 -90%" : "0 20% 0 110%";
        }
    });
};

/**
 * Position verticale de scroll du document (racine), fiable entre navigateurs.
 */
const getDocumentScrollY = function () {
    const root = document.scrollingElement || document.documentElement;
    const fromRoot = root && typeof root.scrollTop === "number" ? root.scrollTop : 0;
    const fromWin =
        typeof window.pageYOffset === "number"
            ? window.pageYOffset
            : typeof window.scrollY === "number"
              ? window.scrollY
              : 0;
    const fromBody = document.body && typeof document.body.scrollTop === "number" ? document.body.scrollTop : 0;
    return Math.max(fromRoot, fromWin, fromBody);
};

const shouldSkipMenuCompact = function () {
    const page = getCurrentPage();
    return page === "blogpost.html" || page === "contact.html";
};

const teardownHeaderScrollMarker = function () {
    const root = document.getElementById("__headerScrollMarkerRoot");
    if (root && root.parentNode) {
        root.parentNode.removeChild(root);
    }
};

/**
 * Point de repère dans le flux juste après #menu (fixed) : repère à ~181px du haut du document.
 * Le repli du header utilise scrollTop OU la position du repère (robuste si scrollY reste à 0).
 */
const ensureHeaderScrollMarker = function () {
    teardownHeaderScrollMarker();

    const menu = document.getElementById("menu");
    if (!menu || !menu.querySelector("nav div")) return;
    if (!isDesktopHeaderLayout() || shouldSkipMenuCompact()) return;

    const markerRoot = document.createElement("div");
    markerRoot.id = "__headerScrollMarkerRoot";
    markerRoot.setAttribute("aria-hidden", "true");
    markerRoot.style.cssText =
        "position:relative;width:100%;height:0;margin:0;padding:0;border:0;overflow:visible;pointer-events:none;visibility:hidden";

    const markerPoint = document.createElement("div");
    markerPoint.className = "header-scroll-marker-point";
    markerPoint.style.cssText =
        "position:absolute;left:0;top:" +
        String(HEADER_MARKER_POINT_TOP) +
        "px;width:1px;height:1px;margin:0;padding:0;overflow:hidden";

    markerRoot.appendChild(markerPoint);
    menu.insertAdjacentElement("afterend", markerRoot);
};

const updateHeaderCompactState = function () {
    const menu = document.getElementById("menu");
    if (!menu || !menu.querySelector("nav div")) return;

    if (!isDesktopHeaderLayout() || shouldSkipMenuCompact()) {
        menu.classList.remove("menu--scroll-compact");
        return;
    }

    const y = getDocumentScrollY();
    const point = document.querySelector(".header-scroll-marker-point");
    let compact = y > MENU_COMPACT_SCROLL_PX;

    if (point) {
        const r = point.getBoundingClientRect();
        const markerBelowViewport = r.top >= window.innerHeight;
        if (y <= MENU_COMPACT_SCROLL_PX && markerBelowViewport) {
            compact = false;
        } else {
            compact = compact || r.top <= 0;
        }
    }

    menu.classList.toggle("menu--scroll-compact", compact);
};

/** Cartes timeline : clic carte = lien principal ; hover/focus en CSS. */
const enableTimelineCardClick = function () {
    document.querySelectorAll(".timeline .content").forEach(function (card) {
        const primaryLink = card.querySelector(".block > a[href]");
        if (!primaryLink) return;

        const href = primaryLink.getAttribute("href");
        if (!href) return;
        const target = primaryLink.getAttribute("target");

        card.classList.add("card-clickable");
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "link");
        card.setAttribute("aria-label", primaryLink.textContent ? primaryLink.textContent.trim() : "Open item");

        const openCard = function () {
            if (target === "_blank") {
                window.open(href, "_blank", "noopener,noreferrer");
                return;
            }
            window.location.href = href;
        };

        card.addEventListener("click", function (event) {
            if (event.target.closest("a")) return;
            if (event.target.closest(".date")) return;
            openCard();
        });

        card.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openCard();
        });
    });
};

const syncScrollEffects = function () {
    checkFooterPosition();
    animateTimelineBlocks();
    updateHeaderCompactState();
};

let scrollEffectsRaf = null;
const scheduleScrollEffects = function () {
    if (scrollEffectsRaf !== null) return;
    scrollEffectsRaf = requestAnimationFrame(function () {
        scrollEffectsRaf = null;
        syncScrollEffects();
    });
};

let scrollBindingsInstalled = false;

const installScrollBindings = function () {
    if (scrollBindingsInstalled) return;
    scrollBindingsInstalled = true;

    window.addEventListener("scroll", scheduleScrollEffects, { passive: true });
    document.addEventListener("scroll", scheduleScrollEffects, { passive: true, capture: true });
    window.addEventListener("resize", scheduleScrollEffects, { passive: true });

    if (window.visualViewport) {
        window.visualViewport.addEventListener("scroll", scheduleScrollEffects, { passive: true });
        window.visualViewport.addEventListener("resize", scheduleScrollEffects, { passive: true });
    }

    scheduleScrollEffects();
};

let desktopMqListenerInstalled = false;
const installDesktopMqListener = function () {
    if (desktopMqListenerInstalled) return;
    desktopMqListenerInstalled = true;
    try {
        const mq = window.matchMedia(DESKTOP_LAYOUT_MEDIA);
        const onChange = function () {
            teardownHeaderScrollMarker();
            ensureHeaderScrollMarker();
            scheduleScrollEffects();
        };
        if (typeof mq.addEventListener === "function") {
            mq.addEventListener("change", onChange);
        } else if (typeof mq.addListener === "function") {
            mq.addListener(onChange);
        }
    } catch (e) {
        /* ignore */
    }
};

/**
 * Marges / hauteurs dépendantes de la hauteur réelle du header (ex. après chargement du logo).
 * #page : home + pages détail (/projects/, /experiences/, /blogpost/) — pas sur les listings timeline.
 */
const applyLayoutMargins = function () {
    const page = getCurrentPage();
    const menu = document.getElementById("menu");
    const footer = document.getElementById("footer");
    const banner = document.getElementById("banner");
    const content = document.getElementById("content");
    const pageContainer = document.getElementById("page");
    const timeline = document.querySelector(".timeline");

    if (!menu) return;

    const menuHeight = menu.clientHeight;
    const menuOuterHeight = menu.offsetHeight;
    const pageHeight = window.innerHeight - menuOuterHeight - (footer ? footer.offsetHeight : 0);

    if (banner && page === "index.html") {
        banner.style.margin = menuOuterHeight + "px 0 0 0";
    }

    const applyPageShellMargins = page === "index.html" || isDetailSectionPath();
    /* CV (index) et pages détail : pas de marge bas en % sur #page — même respiration que le shell (padding contenu / footer). */
    if (pageContainer && applyPageShellMargins) {
        pageContainer.style.margin = menuOuterHeight + "px auto 0 auto";
    }

    /* Contact : pas de marges latérales en % — seul le décalage sous le header fixe. */
    if (content && page === "contact.html") {
        content.style.margin = menuOuterHeight + "px 0 0 0";
    }
    if (timeline) {
        timeline.style.margin = menuHeight + "px auto 0 auto";
    }

    const isLongHome = document.body.dataset.homeLayout === "content";

    if (((page === "index.html" && !isLongHome) || page === "contact.html") && !isMobile()) {
        const element = page === "index.html" ? banner : content;
        document.body.style.overflow = "hidden";
        if (element) {
            element.style.height = pageHeight + "px";
        }
    }

    if (page === "blogpost.html" && !isMobile()) {
        if (timeline) {
            timeline.style.height = pageHeight + "px";
        }
        document.body.style.overflow = "hidden";
        if (footer) {
            footer.style.position = "fixed";
        }
    }
};

const wirePictureGallerySwap = function () {
    const firstImage = document.querySelector("#pictures #firstImg");
    const selectableImages = document.querySelectorAll("#pictures div img");
    if (!firstImage) return;

    firstImage.style.cursor = "pointer";
    selectableImages.forEach(function (img) {
        if (!window.location.pathname.endsWith("oogarden.html")) {
            img.style.cursor = "pointer";
        }
        img.addEventListener("click", function (event) {
            const newSrc = img.getAttribute("src");
            const oldSrc = firstImage.getAttribute("src");
            firstImage.setAttribute("src", newSrc || "");
            img.setAttribute("src", oldSrc || "");
            window.scrollTo({
                top:
                    firstImage.getBoundingClientRect().top + getDocumentScrollY() - GALLERY_SCROLL_FOCUS_OFFSET_PX,
                behavior: prefersReducedMotion() ? "auto" : "smooth",
            });
            event.preventDefault();
        });
    });
};

const initCommonTools = function () {
    document.body.classList.add("loaded");

    document.querySelectorAll(".current-year").forEach(function (yearElement) {
        yearElement.textContent = String(new Date().getFullYear());
    });

    document.querySelectorAll("img").forEach(function (img) {
        if (img.closest("#menu")) return;
        if (img.closest("#banner")) {
            img.loading = "eager";
        } else if (!img.hasAttribute("loading")) {
            img.loading = "lazy";
        }
        if (!img.hasAttribute("decoding")) {
            img.decoding = "async";
        }
    });

    applyLayoutMargins();
    wirePictureGallerySwap();

    checkFooterPosition();
    animateTimelineBlocks();
    enableTimelineCardClick();
    installScrollBindings();
    installDesktopMqListener();
    ensureHeaderScrollMarker();
};

const onWindowLoad = function () {
    applyLayoutMargins();
    ensureHeaderScrollMarker();
    syncScrollEffects();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCommonTools, { once: true });
} else {
    initCommonTools();
}

window.addEventListener("load", onWindowLoad, { once: true });
