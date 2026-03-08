const { app, connectDb } = require("../server");

let isDbReady = false;

module.exports = async (req, res) => {
    try {
        if (!process.env.MONGODB_URI) {
            return res.status(500).json({ message: "Missing MONGODB_URI on server." });
        }

        if (!isDbReady) {
            await connectDb();
            isDbReady = true;
        }

        return app(req, res);
    } catch (error) {
        console.error("Serverless invocation failed:", error);
        return res.status(500).json({ message: "Backend function failed to initialize." });
    }
};
