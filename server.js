
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 5500;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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

app.get("/participation", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "participation.html"));
});

app.get("/public", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "public.html"));
});

app.get("/planning", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "planning.html"));
});

app.get("/mentions-legales", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "mentions-legales.html"));
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
