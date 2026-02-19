const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

module.exports = function setupPassport() {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const googleId = profile.id;
                    const email = profile.emails?.[0]?.value || "";
                    const name = profile.displayName || "User";
                    const avatar = profile.photos?.[0]?.value || "";

                    let user = await User.findOne({ googleId });

                    if (!user) {
                        user = await User.create({ googleId, email, name, avatar });
                    } else {
                        // keep data fresh
                        user.email = email || user.email;
                        user.name = name || user.name;
                        user.avatar = avatar || user.avatar;
                        await user.save();
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user || null);
        } catch (err) {
            done(err);
        }
    });
};
