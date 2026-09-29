/*
 * Logique commune aux overlays OBS (classement général).
 * - Récupère /api/data (même cache serveur que la page /classement)
 * - Parse "Général" + "Joueur Equipe"
 * - Gère un rendu "keyé" : chaque équipe garde son élément DOM, les changements
 *   de rang sont animés (FLIP) au lieu de tout reconstruire.
 *
 * Paramètres d'URL utiles :
 *   ?demo=1       données fictives (pour tester le style sans serveur/sheet)
 *   ?interval=15  secondes entre 2 rafraîchissements (défaut 10, min 5)
 */
(function () {
    // >>> À ADAPTER si besoin : chemin des logos d'équipe. La casse réelle
    // des fichiers sur le serveur n'est pas garantie identique à celle du
    // code équipe reçu du sheet (VHS, TGO, LDGr...) : makeLogo() essaie la
    // casse exacte d'abord, puis se rabat automatiquement sur la version
    // minuscule si besoin.
    const LOGO_PATH = (code) => `/images/2026_logo_team/${encodeURIComponent(code)}.webp`;
    const LOGO_PATH_LOWER = (code) => `/images/2026_logo_team/${encodeURIComponent(code.toLowerCase())}.webp`;

    const params = new URLSearchParams(location.search);
    const DEMO = params.get("demo") === "1";
    const POLL_MS = Math.max(5, Number(params.get("interval")) || 10) * 1000;

    const isEmptyRow = (r) => !Array.isArray(r) || r.length === 0;

    // Format : [nom complet, code équipe, joueur], ["", "", 2e joueur], ...
    // (colonne 1 = code équipe, vide sur la 2e ligne de la paire).
    function buildRoster(rows) {
        const roster = {};
        if (!Array.isArray(rows)) return roster;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (isEmptyRow(row) || !row[1]) continue;
            const next = rows[i + 1];
            const second = !isEmptyRow(next) && !next[1] ? next[2] : null;
            roster[row[1]] = [row[2] || null, second].filter(Boolean);
        }
        return roster;
    }

    function parseGeneral(data) {
        const entry = data["Général"];
        const roster = buildRoster(data["Joueur Equipe"] && data["Joueur Equipe"].data);
        if (!entry || !Array.isArray(entry.data)) return [];
        return entry.data
            .filter((r) => !isEmptyRow(r) && r.length >= 5 && r[0] && r[2])
            .map((r) => ({
                rank: r[0],
                team: r[2],
                points: r[4] ?? "0",
                pointsValue: Number(String(r[4] ?? "0").replace(",", ".").replace(/\s/g, "")) || 0,
                players: roster[r[2]] || [],
            }));
    }

    function demoData() {
        const teams = ["GS", "UE", "VHS", "LDGr", "TS", "LDGp", "TGO", "2bits"];
        const players = [
            ["Julien", "Totomas15"], ["Corsamme", "Kyorfi"], ["Mathkiller", "Azaaran"], ["Tintin81", "Nath_k_222"],
            ["Varimathrax", "Infornia"], ["Xicube", "Flow"], ["Niamyope", "Dibou"], ["Antokaou", "Rey_wrath"],
        ];
        const pts = [124, 110, 98, 87, 61, 44, 30, 12];
        return {
            "Général": { data: teams.flatMap((t, i) => [[`${i + 1}e`, "", t, "", String(pts[i])], []]) },
            "Joueur Equipe": { data: teams.flatMap((t, i) => [[t, players[i][0]], ["", players[i][1]]]) },
        };
    }

    async function fetchRanking() {
        const data = DEMO ? demoData() : await (await fetch("/api/data", { cache: "no-store" })).json();
        return parseGeneral(data);
    }

    /** Logo d'équipe avec fallback (initiales) si l'image n'existe pas encore. */
    function makeLogo(code) {
        const wrap = document.createElement("span");
        wrap.className = "logo";
        const img = new Image();
        img.alt = "";
        img.src = LOGO_PATH(code);
        img.dataset.step = "exact";
        img.onerror = () => {
            if (img.dataset.step === "exact") {
                // 1er échec (casse exacte) : on retente en minuscules avant d'abandonner.
                img.dataset.step = "lower";
                img.src = LOGO_PATH_LOWER(code);
                return;
            }
            img.remove();
            wrap.classList.add("logo-fallback");
            const fb = document.createElement("span");
            fb.className = "fb";
            fb.textContent = code.slice(0, 4);
            wrap.appendChild(fb);
        };
        wrap.appendChild(img);
        return wrap;
    }

    /**
     * Rendu keyé + animation FLIP.
     * hooks.create(row, index) -> élément ; hooks.update(el, row, index, rows) ; hooks.enter(el, index)
     */
    function mount(list, rows, hooks, state) {
        const first = new Map();
        state.map.forEach((el) => first.set(el, el.getBoundingClientRect().top));

        const seen = new Set();
        const ordered = rows.map((row, i) => {
            seen.add(row.team);
            let el = state.map.get(row.team);
            if (!el) {
                el = hooks.create(row, i);
                state.map.set(row.team, el);
                list.appendChild(el);
                if (hooks.enter) hooks.enter(el, i);
            }
            hooks.update(el, row, i, rows);
            return el;
        });

        state.map.forEach((el, key) => {
            if (!seen.has(key)) { el.remove(); state.map.delete(key); }
        });

        ordered.forEach((el) => list.appendChild(el));

        ordered.forEach((el) => {
            if (!first.has(el)) return;
            const dy = first.get(el) - el.getBoundingClientRect().top;
            if (Math.abs(dy) > 1) {
                el.animate(
                    [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
                    { duration: 800, easing: "cubic-bezier(.2,.8,.2,1)" }
                );
            }
        });
    }

    /** Compteur animé pour les points. */
    function animateNumber(el, to, raw) {
        const from = Number(el.dataset.value);
        el.dataset.value = to;
        if (Number.isNaN(from) || from === to) { el.textContent = raw; return; }
        const start = performance.now();
        const dur = 900;
        (function tick(now) {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = t < 1 ? Math.round(from + (to - from) * eased) : raw;
            if (t < 1) requestAnimationFrame(tick);
        })(start);
    }

    function start(render) {
        const state = { map: new Map() };
        let last = null;
        async function tick() {
            try {
                last = await fetchRanking();
                render(last, state);
            } catch (e) {
                console.error("OBS classement :", e); // on garde l'affichage précédent
            }
        }
        tick();
        setInterval(tick, POLL_MS);
    }

    window.OBSRanking = { start, mount, makeLogo, animateNumber };
})();
