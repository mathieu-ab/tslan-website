import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { google } from 'googleapis';
import 'dotenv/config';

const app = express();
const PORT = 5500;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const auth = new google.auth.GoogleAuth({
    keyFile: path.join(
        __dirname,
        "credentials",
        "tslan-454820-7d72796dd3df.json"
    ),
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly"
    ]
});

const sheets = google.sheets({
    version: "v4",
    auth
});








app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/archives", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "archives.html"));
});

app.get("/jeux", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "jeux.html"));
});

app.get("/classement", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "classement.html"));
});

app.get("/participation", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "participation.html"));
});

app.get("/public", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "public.html"));
});

app.get("/planning", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "planning.html"));
});

app.get("/obs", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "obs-classement.html"));
});

app.get("/obs-wow", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "obs-classement-gaming.html"));
});

app.get("/mentions-legales", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "mentions-legales.html"));
});


const sheetsConfig = {
    "Général": {
        data: "Général!B26:I39"
    },

    "Joueur Equipe": {
        data: "'Data'!B4:D17"
    },

    "LeagueofLegends": {
        data: "LeagueofLegends!O4:P17",
        validation: "LeagueofLegends!R8:T9"
    },

    "Minecraft UHC Sphères": {
        data: "'Minecraft UHC Sphères'!D4:E17",
        validation: "'Minecraft UHC Sphères'!G8:I9"
    },

    "CounterStrike2": {
        data: "CounterStrike2!N4:O17",
        validation: "CounterStrike2!Q8:S9"
    },

    "Gang Beasts": {
        data: "'Gang Beasts'!J4:K17",
        validation: "'Gang Beasts'!M8:O9"
    },

    "Just Dance": {
        data: "'Just Dance'!E4:F17",
        validation: "'Just Dance'!H8:J9"
    },

    "Left4Dead 2": {
        data: "'Left4Dead 2'!D4:E17",
        validation: "'Left4Dead 2'!G8:I9"
    },

    "Trackmania": {
        data: "Trackmania!F4:G17",
        validation: "Trackmania!I8:K9"
    },

    "Hollow Knight Silksong": {
        data: "'Hollow Knight Silksong'!B26:C39",
        validation: "'Hollow Knight Silksong'!E30:G31"
    },

    "The Finals": {
        data: "'The Finals'!N4:O17",
        validation: "'The Finals'!Q8:S9"
    },

    "Rocket League": {
        data: "'Rocket League'!O4:P17",
        validation: "'Rocket League'!R8:T9"
    },

    "Jeu mystère": {
        data: "'Jeu mystère'!F4:G17",
        validation: "'Jeu mystère'!I8:K9"
    },

    "Quiz": {
        data: "Quiz!AX4:AY17",
        validation: "Quiz!BA8:BC9"
    }
};

// --- Cache serveur pour /api/data ---
// Objectif : éviter qu'un pic de visiteurs (page /classement rafraîchie en
// continu pendant l'event) ne déclenche un appel à l'API Google Sheets par
// client. Un seul appel réel à Google est fait, au maximum une fois toutes
// les CACHE_TTL_MS millisecondes, peu importe le nombre de clients :
//  - 1er appel (ou 1er appel après expiration du cache) -> on interroge
//    Google Sheets et on met à jour le cache.
//  - tout appel suivant dans les CACHE_TTL_MS -> on sert directement le
//    cache sans requête à Google.
const CACHE_TTL_MS = 10000;

// Anti-abus pour le bypass manuel (bouton "actualiser" côté client) :
// même avec ?force=1, impossible de déclencher un appel réel à Google Sheets
// plus d'une fois toutes les FORCE_MIN_INTERVAL_MS, tous clients confondus.
const FORCE_MIN_INTERVAL_MS = 5000;

let cachedData = null;
let cacheTimestamp = 0;
let lastForcedTimestamp = 0;
let pendingFetch = null; // évite les appels concurrents si plusieurs requêtes arrivent pile au même moment

// Toutes les plages (data + validation, ~24 au total) sont regroupées dans
// UN seul appel batchGet plutôt qu'un values.get par plage. Cela évite de
// cramer le quota "Read requests per minute" de l'API Sheets : batchGet ne
// compte que pour 1 requête, quel que soit le nombre de plages demandées.
async function fetchSheetsData() {
    const entries = Object.entries(sheetsConfig);

    // On construit la liste des plages à demander, en gardant la trace de
    // quel onglet + quel type (data/validation) correspond à quel index,
    // pour pouvoir reconstituer la même structure qu'avant après coup.
    const ranges = [];
    const rangeMeta = [];

    for (const [pageName, config] of entries) {
        ranges.push(config.data);
        rangeMeta.push({ pageName, type: "data" });

        if (config.validation) {
            ranges.push(config.validation);
            rangeMeta.push({ pageName, type: "validation" });
        }
    }

    const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: process.env.API_SHEET_KEY,
        ranges
    });

    const valueRanges = response.data.valueRanges || [];
    const results = {};

    rangeMeta.forEach((meta, index) => {
        const values = valueRanges[index]?.values || [];

        if (!results[meta.pageName]) {
            results[meta.pageName] = { data: [] };
        }

        if (meta.type === "data") {
            results[meta.pageName].data = values;
        } else {
            results[meta.pageName].validation = values?.[0]?.[0] ?? null;
        }
    });

    return results;
}

async function getSheetsData({ force = false } = {}) {
    const now = Date.now();
    const cacheIsFresh = cachedData && (now - cacheTimestamp) < CACHE_TTL_MS;
    const canForce = force && (now - lastForcedTimestamp) >= FORCE_MIN_INTERVAL_MS;

    if (cacheIsFresh && !canForce) {
        return cachedData;
    }

    // Si une mise à jour est déjà en cours (plusieurs clients arrivent en
    // même temps juste après expiration du cache, ou plusieurs personnes
    // cliquent "actualiser" en même temps), on attend son résultat au lieu
    // de déclencher un 2e appel à Google Sheets en parallèle.
    if (pendingFetch) {
        return pendingFetch;
    }

    if (canForce) {
        lastForcedTimestamp = now;
    }

    pendingFetch = fetchSheetsData()
        .then((data) => {
            cachedData = data;
            cacheTimestamp = Date.now();
            return cachedData;
        })
        .finally(() => {
            pendingFetch = null;
        });

    try {
        return await pendingFetch;
    } catch (error) {
        // En cas d'erreur, si on a une version en cache même périmée, on la
        // sert plutôt que de casser l'affichage du classement en plein event.
        if (cachedData) {
            console.error("Erreur Google Sheet, on sert le cache existant :", error);
            return cachedData;
        }
        throw error;
    }
}

app.get("/api/data", async (req, res) => {
    try {
        const force = req.query.force === "1" || req.query.force === "true";
        const data = await getSheetsData({ force });
        res.json(data);
    } catch (error) {

        console.error("Erreur Google Sheet :", error);

        res.status(500).json({
            error: "Impossible de récupérer les données."
        });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
