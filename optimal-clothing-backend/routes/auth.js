const express = require("express");
const passport = require("passport");

const router = express.Router();

// start Google login
router.get(
    "/google",
    (req, res, next) => {
        // ✅ always store ONLY path (not full origin)
        const returnTo = req.query.returnTo || "/app";
        req.session.returnTo = returnTo;
        next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// callback
router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: `${process.env.FRONTEND_URL}/login`,
    }),
    (req, res) => {
        const returnTo = req.session.returnTo || "/app";
        delete req.session.returnTo;

        // ✅ ALWAYS go back to /login with next param
        res.redirect(
            `${process.env.FRONTEND_URL}/login?next=${encodeURIComponent(returnTo)}`
        );
    }
);

// get current user
router.get("/me", (req, res) => {
    if (!req.user) return res.status(401).json({ user: null });
    res.json({
        user: {
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            avatar: req.user.avatar,
        },
    });
});

// logout
router.post("/logout", (req, res) => {
    req.logout(() => {
        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            res.json({ ok: true });
        });
    });
});

module.exports = router;
