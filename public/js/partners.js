/**
 * Bandeau défilant des partenaires — injecté automatiquement au-dessus du <footer>.
 * Pour ajouter / retirer un partenaire : modifier uniquement la liste ci-dessous.
 * Les logos sont dans /public/images/partenaire/ (format .webp).
 *
 * Options par partenaire :
 *   url   : rend le logo cliquable (nouvel onglet)
 *   light : true => tuile claire (pour un logo qui n'est lisible que sur fond clair)
 */
(function () {
    const BASE = "/images/partenaire/";

    const PARTNERS = [
        { name: "Levia Com",     logo: "levia-com.webp" },
        { name: "l'Art en Scène",  logo: "art-en-scene.webp" },
        { name: "Ville de Bar-sur-Seine",           logo: "bss.webp" },
        { name: "Crédit Mutuel", logo: "cm68.webp", light: true }, // JPG à fond blanc : retirer "light" une fois un logo transparent fourni
        { name: "Offpoint Media",      logo: "offpoint.webp" },
        { name: "Teoad Show Production",           logo: "tsp.webp" }
    ];

    // Nombre de répétitions de la liste dans un groupe (pour couvrir les très grands écrans)
    const REPEAT = 4;
    // Vitesse de défilement en pixels par seconde (identique sur mobile et desktop)
    const SPEED = 30;
    // Vitesse relative quand la souris est sur le bandeau (1 = normal)
    const HOVER_RATE = 0.25;
    // Sur écran tactile : durée pendant laquelle le logo touché reste mis en avant (ms)
    const TOUCH_HOLD = 2500;

    function buildItem(p, decorative) {
        const img = document.createElement("img");
        img.src = BASE + p.logo;
        img.alt = decorative ? "" : p.name;
        img.loading = "lazy";
        img.decoding = "async";

        const tile = document.createElement(p.url ? "a" : "div");
        tile.className = "partner-tile" + (p.light ? " is-light" : "");
        if (p.url) {
            tile.href = p.url;
            tile.target = "_blank";
            tile.rel = "noopener sponsored";
            tile.setAttribute("aria-label", p.name);
            if (decorative) tile.tabIndex = -1;
        }

        const label = document.createElement("span");
        label.className = "partner-name";
        label.textContent = p.name;
        label.setAttribute("aria-hidden", "true");

        tile.append(img, label);
        return tile;
    }

    function buildGroup(hidden) {
        const group = document.createElement("div");
        group.className = "partners-group";
        if (hidden) group.setAttribute("aria-hidden", "true");
        for (let i = 0; i < REPEAT; i++) {
            PARTNERS.forEach(p => group.appendChild(buildItem(p, hidden || i > 0)));
        }
        return group;
    }

    // Vitesse constante en px/s : la durée dépend de la largeur réelle du groupe
    function setupSpeed(marquee) {
        let pending = false;
        function apply() {
            pending = false;
            const group = marquee.querySelector(".partners-group");
            const w = group ? group.offsetWidth : 0;
            if (w > 0) marquee.style.setProperty("--partners-duration", (w / SPEED).toFixed(1) + "s");
        }
        function schedule() {
            if (!pending) { pending = true; requestAnimationFrame(apply); }
        }
        window.addEventListener("resize", schedule);
        window.addEventListener("load", schedule);
        return schedule;
    }

    // Ralentissement progressif (une animation CSS ne peut pas être adoucie en CSS pur :
    // on ajuste playbackRate image par image) + gestion du tactile.
    function setupInteraction(marquee) {
        let rate = 1, target = 1, raf = null, holdTimer = null, activeTile = null;

        function tick() {
            rate += (target - rate) * 0.08;
            if (Math.abs(target - rate) < 0.005) rate = target;
            marquee.querySelectorAll(".partners-group").forEach(g =>
                g.getAnimations().forEach(a => { a.playbackRate = rate; })
            );
            raf = rate !== target ? requestAnimationFrame(tick) : null;
        }
        function go(t) {
            target = t;
            if (!raf) raf = requestAnimationFrame(tick);
        }
        function clearActive() {
            clearTimeout(holdTimer);
            if (activeTile) { activeTile.classList.remove("is-active"); activeTile = null; go(1); }
        }

        // Souris
        marquee.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") go(HOVER_RATE); });
        marquee.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") go(1); });

        // Clavier
        marquee.addEventListener("focusin", () => go(HOVER_RATE));
        marquee.addEventListener("focusout", () => go(1));

        // Tactile : un appui met le logo en avant (zoom + nom) et fige le défilement un instant
        marquee.addEventListener("pointerdown", e => {
            if (e.pointerType === "mouse") return;
            const tile = e.target.closest(".partner-tile");
            clearActive();
            if (!tile) return;
            activeTile = tile;
            tile.classList.add("is-active");
            go(0);
            holdTimer = setTimeout(clearActive, TOUCH_HOLD);
        });
        document.addEventListener("pointerdown", e => {
            if (e.pointerType !== "mouse" && !marquee.contains(e.target)) clearActive();
        });
    }

    function init() {
        if (!PARTNERS.length || document.querySelector(".partners-banner")) return;

        const section = document.createElement("section");
        section.className = "partners-banner";
        section.setAttribute("aria-label", "Nos partenaires");

        const title = document.createElement("h2");
        title.className = "partners-title";
        title.textContent = "Nos partenaires";

        const marquee = document.createElement("div");
        marquee.className = "partners-marquee";
        marquee.appendChild(buildGroup(false));
        marquee.appendChild(buildGroup(true));

        section.append(title, marquee);

        const footer = document.querySelector("footer");
        if (footer) footer.parentNode.insertBefore(section, footer);
        else document.body.appendChild(section);

        const scheduleSpeed = setupSpeed(marquee);
        setupInteraction(marquee);

        let css = document.querySelector('link[href="/css/partners.css"]');
        if (!css) {
            css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = "/css/partners.css";
            css.addEventListener("load", scheduleSpeed);
            document.head.appendChild(css);
        } else {
            scheduleSpeed();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
