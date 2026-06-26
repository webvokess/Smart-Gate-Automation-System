let _io;

const initSocket = (io) => {
  _io = io;
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("join_room", (room) => socket.join(room));
    socket.on("disconnect", () => console.log(`Socket disconnected: ${socket.id}`));
  });
};

const getIO = () => _io;

module.exports = { initSocket, getIO };
