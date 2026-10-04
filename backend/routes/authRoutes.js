const express = require("express");
const {
    createSupabaseAuthClient,
    supabaseAdmin
} = require("../config/supabase");

const router = express.Router();

const normalizeEmail = (value) =>
    String(value || "").trim().toLowerCase();

const validEmail = (value) =>
    /^\S+@\S+\.\S+$/.test(value);

/* =========================================================
   CREATE PROFILE
   ========================================================= */

async function createProfile(user, name) {
    const email = user.email;

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .upsert(
            {
                id: user.id,
                full_name: name || user.user_metadata?.full_name || "Student",
                email: email,
                role: "user",
                plan: "free"
            },
            {
                onConflict: "id"
            }
        )
        .select("id, full_name, email, role, plan")
        .single();

    if (error) {
        console.error("Profile creation error:", error);
        throw new Error("Could not create user profile.");
    }

    return data;
}

/* =========================================================
   REGISTER
   POST /api/auth/register
   ========================================================= */

router.post("/register", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Please enter your full name."
            });
        }

        if (!validEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const supabase = createSupabaseAuthClient();

        const {
            data,
            error
        } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            console.error("Signup error:", error);

            return res.status(error.status || 400).json({
                success: false,
                message: error.message
            });
        }

        if (!data.user) {
            return res.status(400).json({
                success: false,
                message: "Account could not be created."
            });
        }

        /*
         * Create profile immediately.
         * This works when email confirmation is disabled.
         */
        let profile = null;

        try {
            profile = await createProfile(data.user, name);
        } catch (profileError) {
            console.error(profileError);
        }

        /*
         * Email confirmation enabled
         */
        if (!data.session) {
            return res.status(201).json({
                success: true,
                needsConfirmation: true,
                message:
                    "Account created successfully. Please confirm your email, then sign in.",
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: name
                },
                session: null
            });
        }

        return res.status(201).json({
            success: true,
            needsConfirmation: false,
            message: "Account created successfully.",
            user: {
                id: profile?.id || data.user.id,
                email: profile?.email || data.user.email,
                name: profile?.full_name || name,
                role: profile?.role || "user",
                plan: profile?.plan || "free"
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            }
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to create account."
        });
    }
});

/* =========================================================
   LOGIN
   POST /api/auth/login
   ========================================================= */

router.post("/login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");

        if (!validEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Please enter your password."
            });
        }

        const supabase = createSupabaseAuthClient();

        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.user || !data.session) {
            console.error("Login error:", error);

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        /*
         * Get profile
         */
        let {
            data: profile,
            error: profileError
        } = await supabaseAdmin
            .from("profiles")
            .select(
                "id, full_name, email, role, plan"
            )
            .eq("id", data.user.id)
            .maybeSingle();

        /*
         * If profile doesn't exist, create it automatically.
         */
        if (profileError || !profile) {
            try {
                profile = await createProfile(
                    data.user,
                    data.user.user_metadata?.full_name ||
                    email.split("@")[0]
                );
            } catch (profileCreateError) {
                console.error(
                    "Profile auto-create failed:",
                    profileCreateError
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Login succeeded, but your profile could not be created."
                });
            }
        }

        return res.json({
            success: true,
            message: "Login successful.",
            user: {
                id: profile.id,
                name:
                    profile.full_name ||
                    email.split("@")[0],
                email: profile.email || email,
                role: profile.role || "user",
                plan: profile.plan || "free"
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to login."
        });
    }
});


/* =========================================================
   ADMIN LOGIN
   POST /api/auth/admin-login
   ========================================================= */
router.post("/admin-login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");
        if (!validEmail(email) || !password) {
            return res.status(400).json({ success: false, message: "Enter a valid admin email and password." });
        }
        const supabase = createSupabaseAuthClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user || !data.session) {
            return res.status(401).json({ success: false, message: "Invalid admin credentials." });
        }
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email, role, plan")
            .eq("id", data.user.id)
            .maybeSingle();
        if (profileError || !profile || profile.role !== "admin") {
            return res.status(403).json({ success: false, message: "This account is not an administrator." });
        }
        return res.json({
            success: true,
            message: "Admin login successful.",
            user: {
                id: profile.id,
                name: profile.full_name || "Administrator",
                email: profile.email || email,
                role: "admin",
                plan: profile.plan || "premium"
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            }
        });
    } catch (error) {
        console.error("ADMIN LOGIN ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to login as admin." });
    }
});

module.exports = router;