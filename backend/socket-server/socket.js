import http from "http";
import { Server } from "socket.io";


const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

let activeUsers = 0;
let trendingSearches = {};
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
        io.emit("trendingSearches", trendingList);

        console.log("Updated trending searches:", trendingList);
    });

    // disconnect shit will be here 
    socket.on("disconnect", () => {
        activeUsers--;
        console.log(`A user disconnected. Active users: ${activeUsers}`);
        io.emit("activeUsers", activeUsers);
    });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Socket.IO server running at http://localhost:${PORT}/`);
});


