const { app, connectDb } = require("../server");

let isDbReady = false;

module.exports = async (req, res) => {
    if (!isDbReady) {
        await connectDb();
        isDbReady = true;
    }

    return app(req, res);
};
