import http from "http";
import { Server } from "socket.io";


const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

let activeUsers = 0;
io.on("connection", (socket) => {
    activeUsers++;
    console.log(`A user connected. Active users: ${activeUsers}`);

    io.emit("activeUsers", activeUsers);

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
