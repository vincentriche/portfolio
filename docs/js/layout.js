/*
 * Shared layout for static pages: injects header (#menu) and footer (#footer).
 * Keep `PATH_DETAIL_SECTION_RE` in sync with common_tools.js.
 */

(function () {
    "use strict";

    /** Same pattern as `PATH_DETAIL_SECTION_RE` in common_tools.js (paths under /projects/, etc.). */
    const PATH_DETAIL_SECTION_RE = /\/(projects|experiences|blogpost)\//;

    const path = window.location.pathname;
    const isNestedPage = PATH_DETAIL_SECTION_RE.test(path);
    const prefix = isNestedPage ? "../" : "";
    const inferActivePage = function () {
        if (path.endsWith("/index.html") || path === "/" || path.endsWith("/html/")) return "cv";
        if (path.endsWith("/blogpost.html") || path.includes("/blogpost/")) return "posts";
        if (path.endsWith("/experiences.html") || path.includes("/experiences/")) return "experiences";
        if (path.endsWith("/projects.html") || path.includes("/projects/")) return "projects";
        if (path.endsWith("/contact.html")) return "contact";
        return "cv";
    };
    const activePage = document.body.dataset.nav || inferActivePage();

    const navItems = [
        { key: "cv", label: "CV", href: "index.html" },
        { key: "posts", label: "Posts", href: "blogpost.html" },
        { key: "experiences", label: "Experiences", href: "experiences.html" },
        { key: "projects", label: "Games / Projects", href: "projects.html" },
        { key: "contact", label: "Contact", href: "contact.html" }
    ];

    const navLinks = navItems.map(function (item) {
        const isActive = item.key === activePage;
        const activeClass = isActive ? ' class="active"' : "";
        const ariaCurrent = isActive ? ' aria-current="page"' : "";
        return `<li><a${activeClass}${ariaCurrent} href="${prefix}${item.href}">${item.label}</a></li>`;
    }).join("");

    const header = document.getElementById("menu");
    if (header) {
        header.innerHTML = `
            <nav aria-label="Main navigation">
                <ul id="about">
                    <li>
                        <a href="${prefix}index.html" aria-label="Go to home page">
                            <div id="diamond"></div>
                            <img src="${prefix}images/others/logo.webp" alt="Vincent Riche logo" />
                        </a>
                    </li>
                </ul>
                <div>
                    <ul>${navLinks}</ul>
                </div>
            </nav>
        `;
    }

    const footer = document.getElementById("footer");
    if (footer) {
        footer.innerHTML = `<p id="copyright">© <span class="current-year"></span> <a href="${prefix}index.html">Vincent Riche</a>. All rights reserved.</p>`;
    }
})();
