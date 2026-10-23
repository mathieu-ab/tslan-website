// Liste des épreuves attendues, dans l'ordre d'affichage.
// "key" doit correspondre exactement à la clé renvoyée par /api/data (server.js -> sheetsConfig).
const GAMES = [
    { key: "LeagueofLegends", label: "League of Legends", icon: "league_of_legends.webp" },
    { key: "Minecraft UHC Sphères", label: "Minecraft UHC Sphères", icon: "minecraft.webp" },
    { key: "CounterStrike2", label: "Counter Strike 2", icon: "counter_strike_2.webp" },
    { key: "Gang Beasts", label: "Gang Beasts", icon: "gang_beasts.webp" },
    { key: "Just Dance", label: "Just Dance", icon: "just_dance.webp" },
    { key: "Left4Dead 2", label: "Left 4 Dead 2", icon: "left_4_dead_2.webp" },
    { key: "Trackmania", label: "Trackmania", icon: "trackmania.webp" },
    { key: "Hollow Knight Silksong", label: "Hollow Knight Silksong", icon: "silksong.webp" },
    { key: "The Finals", label: "The Finals", icon: "the_finals.webp" },
    { key: "Rocket League", label: "Rocket League", icon: "rocket_league.webp" },
    { key: "Jeu mystère", label: "Jeu Mystère", icon: "jeu_mystère.webp" },
    { key: "Quiz", label: "Quiz", icon: "quiz.webp" },
];

const ICON_BASE = "/images/2026_jeux/";
const REFRESH_INTERVAL_MS = 20000; // le serveur garde son propre cache de 30s, on interroge un peu plus vite que ça sans le forcer

const generalBody = document.getElementById("general-table-body");
const generalError = document.getElementById("general-error");
const accordionContainer = document.getElementById("games-accordion");
const gamesEmptyMessage = document.getElementById("games-empty");
const lastUpdateLabel = document.getElementById("last-update-label");
const refreshBtn = document.getElementById("refresh-btn");

// Mémorise quelle épreuve est actuellement dépliée, pour ne pas la refermer
// quand les données sont rafraîchies automatiquement.
let openGameKey = null;

/**
 * Une ligne "vide" côté Google Sheets arrive sous forme de tableau vide [].
 * Ce garde-fou filtre ces lignes de séparation.
 */
function isEmptyRow(row) {
    return !Array.isArray(row) || row.length === 0;
}

/**
 * Format des données de classement d'une épreuve : ["1e", "VHS"], [], ["2e", "UE"], ...
 * On filtre les lignes vides ET les lignes sans équipe renseignée
 * (cas où seul le rang est présent avant que la partie ne soit terminée).
 */
function parseGameRanking(rows) {
    if (!Array.isArray(rows)) return [];
    return rows
        .filter((row) => !isEmptyRow(row) && row[0] && row[1])
        .map((row) => ({ rank: row[0], team: row[1] }));
}

/**
 * Format du classement général : ["1e", "", "VHS", "", "0"], [], ...
 */
function parseGeneralRanking(rows) {
    if (!Array.isArray(rows)) return [];
    return rows
        .filter((row) => !isEmptyRow(row) && row.length >= 5 && row[0] && row[2])
        .map((row) => ({ rank: row[0], team: row[2], points: row[4] }));
}

/**
 * Format du roster : ["Vacances Hors Surtension", "VHS", "Mathkiller"], ["", "", "Azaaran"], ...
 * Une ligne avec un code équipe (colonne 1) démarre une nouvelle équipe et
 * donne son nom complet (colonne 0), la ligne suivante (colonne 1 vide)
 * donne le 2e joueur.
 */
function buildRoster(rows) {
    const roster = {};
    if (!Array.isArray(rows)) return roster;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (isEmptyRow(row) || !row[1]) continue;

        const teamCode = row[1];
        const fullName = row[0] || teamCode;
        const firstPlayer = row[2] || null;
        const nextRow = rows[i + 1];
        const secondPlayer = !isEmptyRow(nextRow) && !nextRow[1] ? nextRow[2] : null;

        roster[teamCode] = { fullName, players: [firstPlayer, secondPlayer].filter(Boolean) };
    }

    return roster;
}

const LOGO_BASE = "/images/2026_logo_team/";

// La casse réelle des fichiers de logo sur le serveur n'est pas garantie
// identique à celle du code équipe reçu du sheet (VHS, TGO, LDGr...). On
// essaie donc la casse exacte d'abord, puis on se rabat automatiquement sur
// la version minuscule si la 1ère tentative échoue (404), avant d'abandonner
// proprement. Ça évite de devoir renommer des fichiers ou de deviner.
window.__logoFallback = function (img) {
    const next = img.dataset.fallbackSrc;
    if (next) {
        delete img.dataset.fallbackSrc;
        img.src = next;
    } else {
        img.remove();
    }
};

/** Petit logo d'équipe, masqué proprement si aucune variante de casse n'existe. */
function teamLogoImg(code) {
    const exact = encodeURIComponent(code) + ".webp";
    const lower = encodeURIComponent(code.toLowerCase()) + ".webp";
    return `<img class="team-logo" src="${LOGO_BASE}${exact}" data-fallback-src="${LOGO_BASE}${lower}" alt="" loading="lazy" onerror="window.__logoFallback(this)">`;
}

function isValidated(gameEntry) {
    if (!gameEntry) return false;
    const value = (gameEntry.validation || "").toString().trim().toUpperCase();
    return value === "TRUE";
}

function rankClass(index) {
    if (index === 0) return "rank-1";
    if (index === 1) return "rank-2";
    if (index === 2) return "rank-3";
    return "";
}

/** Nom complet + logo pour une cellule équipe. Reste sur le code si l'équipe est inconnue du roster. */
function teamCellHtml(code, roster) {
    const fullName = (roster[code] && roster[code].fullName) || code;
    return `${teamLogoImg(code)}<span class="team-fullname">${fullName} (${code})</span>`;
}

function renderGeneral(data, roster) {
    const generalEntry = data["Général"];
    const rows = parseGeneralRanking(generalEntry && generalEntry.data);

    generalBody.innerHTML = "";

    if (!generalEntry || rows.length === 0) {
        generalError.hidden = false;
        return;
    }

    generalError.hidden = true;

    rows.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.className = rankClass(index);

        const teamInfo = roster[row.team];
        const players = teamInfo && teamInfo.players.length ? teamInfo.players.join(" & ") : "—";

        tr.innerHTML = `
            <td>${row.rank}</td>
            <td class="team-cell">${teamCellHtml(row.team, roster)}</td>
            <td>${players}</td>
            <td>${row.points ?? "—"}</td>
        `;

        generalBody.appendChild(tr);
    });
}

function renderGameTable(rows, roster) {
    if (rows.length === 0) {
        return `<p class="state-message">Classement pas encore disponible.</p>`;
    }

    const bodyRows = rows
        .map(
            (row, index) => `
            <tr class="${rankClass(index)}">
                <td>${row.rank}</td>
                <td class="team-cell">${teamCellHtml(row.team, roster)}</td>
            </tr>`
        )
        .join("");

    return `
        <div class="table-scroll">
            <table class="leaderboard-table">
                <thead>
                    <tr><th>Rang</th><th>Équipe</th></tr>
                </thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
    `;
}

function toggleGame(key, headerEl) {
    const item = headerEl.closest(".accordion-item");
    const isCurrentlyActive = item.classList.contains("active");

    accordionContainer.querySelectorAll(".accordion-item.active").forEach((el) => {
        el.classList.remove("active");
    });

    if (!isCurrentlyActive) {
        item.classList.add("active");
        openGameKey = key;
    } else {
        openGameKey = null;
    }
}

function renderGames(data, roster) {
    const validatedGames = GAMES.filter((game) => isValidated(data[game.key]));

    accordionContainer.querySelectorAll(".accordion-item").forEach((el) => el.remove());

    if (validatedGames.length === 0) {
        gamesEmptyMessage.hidden = false;
        return;
    }

    gamesEmptyMessage.hidden = true;

    validatedGames.forEach((game) => {
        const rows = parseGameRanking(data[game.key].data);

        const item = document.createElement("div");
        item.className = "accordion-item";
        if (openGameKey === game.key) item.classList.add("active");

        item.innerHTML = `
            <button class="accordion-header" type="button">
                <img class="game-icon" src="${ICON_BASE}${game.icon}" alt="" loading="lazy">
                <span class="game-name">${game.label}</span>
                <span class="arrow">▼</span>
            </button>
            <div class="accordion-content">
                <div class="accordion-content-inner">
                    ${renderGameTable(rows, roster)}
                </div>
            </div>
        `;

        item.querySelector(".accordion-header").addEventListener("click", (e) => {
            toggleGame(game.key, e.currentTarget);
        });

        accordionContainer.appendChild(item);
    });
}

function setLastUpdateLabel() {
    const now = new Date();
    const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    lastUpdateLabel.textContent = `Dernière mise à jour : ${time}`;
}

async function loadData({ force = false } = {}) {
    try {
        const url = force ? "/api/data?force=1" : "/api/data";
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const roster = buildRoster(data["Joueur Equipe"] && data["Joueur Equipe"].data);

        renderGeneral(data, roster);
        renderGames(data, roster);
        setLastUpdateLabel();
    } catch (error) {
        console.error("Erreur lors de la récupération du classement :", error);
        lastUpdateLabel.textContent = "Impossible de récupérer les données. Nouvelle tentative en cours…";
    }
}

function manualRefresh() {
    refreshBtn.classList.add("spinning");
    // force=true : bypass le cache serveur (limité côté serveur à 1 appel
    // réel toutes les 5s, tous visiteurs confondus, pour éviter les abus).
    loadData({ force: true }).finally(() => {
        setTimeout(() => refreshBtn.classList.remove("spinning"), 500);
    });
}

refreshBtn.addEventListener("click", manualRefresh);

loadData();
setInterval(loadData, REFRESH_INTERVAL_MS);
