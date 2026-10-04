const SESSION_KEY = "quizcloud_user";
const LEGACY_SESSION_KEY = "quizcloud_session";
const AUTH_API_BASE = "http://localhost:5001/api";

function setSession(user) {
    const value = JSON.stringify(user);
    localStorage.setItem(SESSION_KEY, value);
    localStorage.setItem(LEGACY_SESSION_KEY, value);
    localStorage.setItem("session", value);
}

function getSession() {
    try {
        const raw =
            localStorage.getItem(SESSION_KEY) ||
            localStorage.getItem(LEGACY_SESSION_KEY) ||
            localStorage.getItem("session");
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Session error:", error);
        return null;
    }
}

function getAccessToken() {
    const session = getSession();
    return session?.accessToken || session?.access_token || session?.token || null;
}

function authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

function logoutSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
    localStorage.removeItem("session");
    localStorage.removeItem("quizResult");
}

function requireAuth(role = "user") {
    const session = getSession();
    if (!session) {
        window.location.href = role === "admin" ? "admin-login.html" : "login.html";
        return false;
    }
    if (role && session.role !== role) {
        window.location.href = role === "admin" ? "admin-login.html" : "login.html";
        return false;
    }
    return true;
}

function setAuthMode(mode) {
    const registering = mode === "register";
    const nameGroup = document.getElementById("nameGroup");
    const nameInput = document.getElementById("name");
    const heading = document.getElementById("authHeading");
    const description = document.getElementById("authDescription");
    const submit = document.getElementById("authSubmit");
    const submitText = document.getElementById("loginBtnText");
    const switchText = document.getElementById("authSwitchText");
    const switchButton = document.getElementById("authSwitch");
    const message = document.getElementById("authMessage");

    if (nameGroup) nameGroup.hidden = !registering;
    if (nameInput) nameInput.required = registering;
    if (heading) heading.textContent = registering ? "Create your account" : "Welcome back 👋";
    if (description) description.textContent = registering
        ? "Create your QuizCloud account and start learning."
        : "Sign in to continue your learning journey and keep your streak alive.";
    if (submit) submit.dataset.mode = mode;
    if (submitText) submitText.textContent = registering ? "Create Account" : "Sign in";
    if (switchText) switchText.textContent = registering ? "Already have an account?" : "New to QuizCloud?";
    if (switchButton) switchButton.textContent = registering ? "Sign in" : "Create account";
    if (message) {
        message.textContent = "";
        message.className = "auth-message";
    }
}

function showAuthMessage(text, type = "info") {
    const message = document.getElementById("authMessage") || document.getElementById("loginMessage");
    if (!message) return;
    message.textContent = text;
    message.className = `auth-message ${type}`;
}

async function handleUserAuthSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const mode = form.dataset.mode || "login";
    const name = document.getElementById("name")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("password")?.value || "";
    const submit = document.getElementById("authSubmit");
    const submitText = document.getElementById("loginBtnText");

    if (mode === "register" && !name) return showAuthMessage("Please enter your full name.", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return showAuthMessage("Please enter a valid email address.", "error");
    if (password.length < 8) return showAuthMessage("Password must be at least 8 characters.", "error");

    if (submit) submit.disabled = true;
    if (submitText) submitText.textContent = mode === "register" ? "Creating..." : "Signing in...";
    showAuthMessage(mode === "register" ? "Creating your account..." : "Signing you in...", "loading");

    try {
        const response = await fetch(`${AUTH_API_BASE}/auth/${mode === "register" ? "register" : "login"}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) throw new Error(payload.message || "Authentication failed.");

        if (mode === "register" && payload.needsConfirmation) {
            setAuthMode("login");
            document.getElementById("email").value = email;
            document.getElementById("password").value = "";
            showAuthMessage("Account created. Check your email, confirm the account, then sign in.", "success");
            return;
        }

        if (!payload.session?.access_token) throw new Error("Authentication session was not created.");
        const user = payload.user || {};
        setSession({
            id: user.id,
            name: user.name || name || "Student",
            email: user.email || email,
            role: user.role || "user",
            plan: user.plan || "free",
            accessToken: payload.session.access_token,
            refreshToken: payload.session.refresh_token,
            expiresAt: payload.session.expires_at
        });
        showAuthMessage("Success! Opening QuizCloud...", "success");
        setTimeout(() => { window.location.href = "dashboard.html"; }, 250);
    } catch (error) {
        console.error("Authentication error:", error);
        showAuthMessage(error.message || "Unable to connect to the backend.", "error");
    } finally {
        if (submit) submit.disabled = false;
        if (submitText) submitText.textContent = mode === "register" ? "Create Account" : "Sign in";
    }
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const email = document.getElementById("adminEmail")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("adminPassword")?.value || "";
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const message = document.getElementById("adminLoginMessage");
    const setMessage = (text, type = "error") => {
        if (message) { message.textContent = text; message.className = `auth-message ${type}`; }
    };
    if (!email || !password) return setMessage("Enter your admin email and password.");
    if (button) button.disabled = true;
    try {
        const response = await fetch(`${AUTH_API_BASE}/auth/admin-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) throw new Error(payload.message || "Admin login failed.");
        setSession({
            id: payload.user.id,
            name: payload.user.name || "Administrator",
            email: payload.user.email || email,
            role: "admin",
            plan: payload.user.plan || "premium",
            accessToken: payload.session.access_token,
            refreshToken: payload.session.refresh_token,
            expiresAt: payload.session.expires_at
        });
        setMessage("Admin login successful. Opening dashboard...", "success");
        setTimeout(() => { window.location.href = "admin.html"; }, 250);
    } catch (error) {
        console.error("Admin login error:", error);
        setMessage(error.message || "Unable to login as admin.");
    } finally {
        if (button) button.disabled = false;
    }
}

function setupLogoutButtons() {
    ["logoutButton", "logoutBtn", "adminLogoutButton"].forEach(id => {
        const button = document.getElementById(id);
        if (!button || button.dataset.authBound === "1") return;
        button.dataset.authBound = "1";
        button.addEventListener("click", () => {
            const wasAdmin = getSession()?.role === "admin" || id === "adminLogoutButton";
            logoutSession();
            window.location.href = wasAdmin ? "admin-login.html" : "login.html";
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.dataset.mode = "login";
        const switchButton = document.getElementById("authSwitch");
        if (switchButton) {
            switchButton.addEventListener("click", () => {
                loginForm.dataset.mode = loginForm.dataset.mode === "login" ? "register" : "login";
                setAuthMode(loginForm.dataset.mode);
            });
        }
        loginForm.addEventListener("submit", handleUserAuthSubmit);
        setAuthMode("login");
    }

    const adminForm = document.getElementById("adminLoginForm");
    if (adminForm) adminForm.addEventListener("submit", handleAdminLogin);
    setupLogoutButtons();
});
