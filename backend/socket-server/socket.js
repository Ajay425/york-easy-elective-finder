import http from "http";
import { Server } from "socket.io";
import fs from "fs";


const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});


let trendingSearches = {};
const filepath = "./trending.json"

// get current trend searches from the json file
if (fs.existsSync(filepath)) {
    try {
        trendingSearches = JSON.parse(fs.readFileSync(filepath, "utf-8"));
        console.log("Loaded trending searches from file:", trendingSearches);
    } catch (err) {
        console.error("Error reading trending searches file:", err);
    }
}

function saveTrending(){
    fs.writeFileSync(filepath, JSON.stringify(trendingSearches, null, 2));
}

const badWords = [
    "FUCK", "SHIT", "BITCH", "ASS", "CUNT", "NIGGER", "NIGGA",
    "DICK", "PUSSY", "COCK", "WHORE", "SLUT"
];

function isValidCourseQuery(query) {
    if (!query) return false;

    const q = query.trim().toUpperCase();
    if (q.length < 3) return false;
    if (/^\d+$/.test(q)) return false;
    const courseCodePattern = /^[A-Z]{2,5}\s?\d{3,4}$/;
    if (courseCodePattern.test(q)) return true;
    if (badWords.includes(q)) return false;
    return false;
}



let activeUsers = 0;



io.on("connection", (socket) => {
    activeUsers++;
    io.emit("activeUsers", activeUsers);

    // Sending current trending based searches to a user client
    const sorted = Object.entries(trendingSearches)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const trendingList = sorted.map(([term]) => term);
    socket.emit("trendingSearches", trendingList);

    // Handle the search shit here
    socket.on("search", (query) => {
        if (!query.trim()) return;

        if (!isValidCourseQuery(query)) return;


        trendingSearches[query] = (trendingSearches[query] || 0) + 1;
        saveTrending();

        const sorted = Object.entries(trendingSearches)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const trendingList = sorted.map(([term]) => term);

        console.log("[SEARCH RECEIVED]", query);
        console.log("[TRENDING UPDATED]", trendingList);

        io.emit("trendingSearches", trendingList);
    });

    socket.on("disconnect", () => {
        activeUsers--;
        console.log(`[DISCONNECTED] Active users: ${activeUsers}`);
        io.emit("activeUsers", activeUsers);
    });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Socket.IO server running at http://localhost:${PORT}/`);
});
