const { createSupabaseAuthClient, supabaseAdmin } = require("../config/supabase");

async function getBearerUser(req) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    try {
        const supabase = createSupabaseAuthClient();
        const { data, error } = await supabase.auth.getUser(match[1]);
        if (error || !data?.user) return null;
        return data.user;
    } catch (error) {
        console.error("Token verification error:", error);
        return null;
    }
}

async function requireAdmin(req, res, next) {
    const user = await getBearerUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
    const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();
    if (error || !profile || profile.role !== "admin") {
        return res.status(403).json({ success: false, message: "Admin access required." });
    }
    req.authUser = user;
    req.profile = profile;
    next();
}

module.exports = { getBearerUser, requireAdmin };
