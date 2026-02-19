module.exports = function requireAuth(req, res, next) {
    // passport adds req.isAuthenticated()
    if (req.isAuthenticated && req.isAuthenticated()) return next();
    return res.status(401).json({ message: "Unauthorized" });
};
