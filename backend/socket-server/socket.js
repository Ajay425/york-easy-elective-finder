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


let activeUsers = 0;



io.on("connection", (socket) => {
    activeUsers++;
    console.log(`A user connected. Active users: ${activeUsers}`);
    io.emit("activeUsers", activeUsers);
    // Trend based search optimization for course searching 
    socket.on("search", (query) => {
        if (!query) return;
        trendingSearches[query] = (trendingSearches[query] || 0) + 1;

        const sorted = Object.entries(trendingSearches).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const trendingList = sorted.map(([term]) => term);
        saveTrending();
        io.emit("trendingSearches", trendingList);

        console.log("Updated trending searches:", trendingList);
    });

    // disconnect shit will be here 
    socket.on("disconnect", () => {
        activeUsers--;
        console.log(`A user disconnected. Active users: ${activeUsers}`);
        io.emit("activeUsers", activeUsers);
  
    });

    const sorted = Object.entries(trendingSearches).sort((a, b) => b[1] - a[1]).slice(0, 5);

    socket.emit("trendingSearches", sorted);

});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Socket.IO server running at http://localhost:${PORT}/`);
});
