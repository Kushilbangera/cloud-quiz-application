/* =========================================================
   QUIZCLOUD — ACHIEVEMENTS
   ========================================================= */

const API_BASE = "http://localhost:5001/api";

/* =========================================================
   ACHIEVEMENT DEFINITIONS
   ========================================================= */

const ACHIEVEMENTS = [
    {
        id: "first_quiz",
        title: "First Step",
        description: "Complete your first quiz.",
        icon: "fa-flag",
        xp: 50,
        requirement: 1,
        type: "quizzes"
    },
    {
        id: "quiz_explorer",
        title: "Quiz Explorer",
        description: "Complete 5 quizzes.",
        icon: "fa-compass",
        xp: 100,
        requirement: 5,
        type: "quizzes"
    },
    {
        id: "knowledge_seeker",
        title: "Knowledge Seeker",
        description: "Complete 10 quizzes.",
        icon: "fa-book-open",
        xp: 200,
        requirement: 10,
        type: "quizzes"
    },
    {
        id: "quiz_master",
        title: "Quiz Master",
        description: "Complete 25 quizzes.",
        icon: "fa-crown",
        xp: 500,
        requirement: 25,
        type: "quizzes"
    },
    {
        id: "perfect_score",
        title: "Perfect Score",
        description: "Get a 100% score in a quiz.",
        icon: "fa-bullseye",
        xp: 250,
        requirement: 100,
        type: "perfect"
    },
    {
        id: "high_scorer",
        title: "High Scorer",
        description: "Achieve 90% or higher in a quiz.",
        icon: "fa-chart-line",
        xp: 150,
        requirement: 90,
        type: "highscore"
    },
    {
        id: "xp_hunter",
        title: "XP Hunter",
        description: "Earn 1,000 XP.",
        icon: "fa-bolt",
        xp: 300,
        requirement: 1000,
        type: "xp"
    },
    {
        id: "dedicated_learner",
        title: "Dedicated Learner",
        description: "Complete 50 quizzes.",
        icon: "fa-graduation-cap",
        xp: 1000,
        requirement: 50,
        type: "quizzes"
    }
];

/* =========================================================
   AUTHENTICATION
   ========================================================= */

/*
   IMPORTANT:
   We check multiple possible session locations.

   1. getSession() from auth.js
   2. quizcloud_session from localStorage
   3. quizcloud_user from localStorage
   4. supabase.auth.getSession() if Supabase is available

   We DO NOT immediately redirect to login just because
   one method fails.
*/

async function getCurrentUser() {

    /* -----------------------------------------------------
       1. Try auth.js getSession()
       ----------------------------------------------------- */

    try {

        if (typeof getSession === "function") {

            const session = await getSession();

            if (session) {

                if (session.user) {
                    return session.user;
                }

                if (session.session && session.session.user) {
                    return session.session.user;
                }
            }
        }

    } catch (error) {

        console.warn(
            "auth.js getSession failed:",
            error
        );
    }


    /* -----------------------------------------------------
       2. Try Supabase directly
       ----------------------------------------------------- */

    try {

        if (
            typeof supabase !== "undefined" &&
            supabase &&
            supabase.auth
        ) {

            const {
                data,
                error
            } = await supabase.auth.getSession();

            if (!error && data && data.session) {

                if (data.session.user) {
                    return data.session.user;
                }
            }
        }

    } catch (error) {

        console.warn(
            "Supabase session check failed:",
            error
        );
    }


    /* -----------------------------------------------------
       3. Try quizcloud_session
       ----------------------------------------------------- */

    try {

        const savedSession =
            localStorage.getItem("quizcloud_session");

        if (savedSession) {

            const parsed =
                JSON.parse(savedSession);

            if (parsed) {

                if (parsed.user) {
                    return parsed.user;
                }

                if (
                    parsed.session &&
                    parsed.session.user
                ) {
                    return parsed.session.user;
                }
            }
        }

    } catch (error) {

        console.warn(
            "quizcloud_session read failed:",
            error
        );
    }


    /* -----------------------------------------------------
       4. Try quizcloud_user
       ----------------------------------------------------- */

    try {

        const savedUser =
            localStorage.getItem("quizcloud_user");

        if (savedUser) {

            const parsedUser =
                JSON.parse(savedUser);

            if (parsedUser && parsedUser.id) {
                return parsedUser;
            }
        }

    } catch (error) {

        console.warn(
            "quizcloud_user read failed:",
            error
        );
    }


    return null;
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile(user) {

    const nameElement =
        document.getElementById("profileName");

    const emailElement =
        document.getElementById("profileEmail");

    const avatarElement =
        document.getElementById("profileAvatar");


    const name =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.full_name ||
        user?.name ||
        user?.email?.split("@")[0] ||
        "Student";


    if (nameElement) {
        nameElement.textContent = name;
    }


    if (emailElement) {
        emailElement.textContent =
            user?.email || "";
    }


    if (avatarElement) {

        avatarElement.textContent =
            name.charAt(0).toUpperCase();

    }
}


/* =========================================================
   LOAD RESULTS
   ========================================================= */

async function loadResults(userId) {

    if (!userId) {
        console.warn("No user ID available.");
        return [];
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/results/${encodeURIComponent(userId)}`
            );


        if (!response.ok) {

            throw new Error(
                `Results API returned ${response.status}`
            );
        }


        const data =
            await response.json();


        if (Array.isArray(data)) {
            return data;
        }


        if (Array.isArray(data.data)) {
            return data.data;
        }


        if (Array.isArray(data.results)) {
            return data.results;
        }


        return [];

    } catch (error) {

        console.error(
            "Results loading error:",
            error
        );

        return [];
    }
}


/* =========================================================
   CALCULATE XP
   ========================================================= */

function calculateXP(results) {

    let xp = 0;


    results.forEach(result => {

        const percentage =
            Number(result.percentage || 0);

        const score =
            Number(result.score || 0);


        /* Base XP */

        xp += score * 10;


        /* Performance bonus */

        if (percentage >= 100) {

            xp += 100;

        } else if (percentage >= 90) {

            xp += 50;

        } else if (percentage >= 75) {

            xp += 25;

        }

    });


    return xp;
}


/* =========================================================
   CALCULATE STREAK
   ========================================================= */

function calculateStreak(results) {

    if (!results.length) {
        return 0;
    }


    const dates =
        results
            .map(result => {

                if (!result.completed_at) {
                    return null;
                }

                const date =
                    new Date(
                        result.completed_at
                    );

                if (isNaN(date.getTime())) {
                    return null;
                }

                return date
                    .toISOString()
                    .split("T")[0];

            })
            .filter(Boolean)
            .filter(
                (date, index, arr) =>
                    arr.indexOf(date) === index
            )
            .sort(
                (a, b) =>
                    new Date(b) -
                    new Date(a)
            );


    if (!dates.length) {
        return 0;
    }


    let streak = 1;


    for (
        let i = 0;
        i < dates.length - 1;
        i++
    ) {

        const current =
            new Date(dates[i]);

        const previous =
            new Date(dates[i + 1]);


        const difference =
            Math.round(
                (current - previous) /
                (1000 * 60 * 60 * 24)
            );


        if (difference === 1) {

            streak++;

        } else {

            break;
        }
    }


    return streak;
}


/* =========================================================
   ACHIEVEMENT STATUS
   ========================================================= */

function getAchievementProgress(
    achievement,
    results,
    xp
) {

    const quizCount =
        results.length;


    const percentages =
        results.map(
            result =>
                Number(
                    result.percentage || 0
                )
        );


    switch (achievement.type) {

        case "quizzes":

            return {
                current: quizCount,
                target: achievement.requirement,
                unlocked:
                    quizCount >=
                    achievement.requirement
            };


        case "perfect":

            return {
                current:
                    percentages.includes(100)
                        ? 100
                        : Math.max(
                            ...percentages,
                            0
                        ),

                target: 100,

                unlocked:
                    percentages.includes(100)
            };


        case "highscore":

            return {
                current:
                    Math.max(
                        ...percentages,
                        0
                    ),

                target: 90,

                unlocked:
                    percentages.some(
                        percentage =>
                            percentage >= 90
                    )
            };


        case "xp":

            return {
                current: xp,
                target: achievement.requirement,
                unlocked:
                    xp >=
                    achievement.requirement
            };


        default:

            return {
                current: 0,
                target: achievement.requirement,
                unlocked: false
            };
    }
}


/* =========================================================
   RENDER ACHIEVEMENTS
   ========================================================= */

function renderAchievements(results, xp) {

    const grid =
        document.getElementById(
            "achievementGrid"
        );


    if (!grid) {
        return;
    }


    let unlockedCount = 0;


    grid.innerHTML = "";


    ACHIEVEMENTS.forEach(achievement => {

        const progress =
            getAchievementProgress(
                achievement,
                results,
                xp
            );


        if (progress.unlocked) {
            unlockedCount++;
        }


        const percentage =
            progress.target > 0
                ? Math.min(
                    100,
                    Math.round(
                        (progress.current /
                            progress.target) *
                        100
                    )
                )
                : 0;


        const card =
            document.createElement("div");


        card.className =
            `achievement-card ${
                progress.unlocked
                    ? "unlocked"
                    : "locked"
            }`;


        card.innerHTML = `

            <div class="achievement-icon">
                <i class="fa-solid ${achievement.icon}"></i>
            </div>

            <h3>
                ${achievement.title}
            </h3>

            <p>
                ${achievement.description}
            </p>

            <div class="achievement-status">

                <span class="status-badge ${
                    progress.unlocked
                        ? "unlocked"
                        : "locked"
                }">

                    <i class="fa-solid ${
                        progress.unlocked
                            ? "fa-check"
                            : "fa-lock"
                    }"></i>

                    ${
                        progress.unlocked
                            ? "Unlocked"
                            : "Locked"
                    }

                </span>

                <span class="achievement-xp">
                    +${achievement.xp} XP
                </span>

            </div>

            ${
                !progress.unlocked
                    ? `
                        <div class="achievement-progress-mini">

                            <div class="mini-progress-track">

                                <div
                                    class="mini-progress-fill"
                                    style="width:${percentage}%"
                                ></div>

                            </div>

                            <div class="progress-text">

                                <span>
                                    Progress
                                </span>

                                <span>
                                    ${Math.min(
                                        progress.current,
                                        progress.target
                                    )}
                                    /
                                    ${progress.target}
                                </span>

                            </div>

                        </div>
                    `
                    : ""
            }

        `;


        grid.appendChild(card);

    });


    updateAchievementSummary(
        results,
        xp,
        unlockedCount
    );
}


/* =========================================================
   UPDATE SUMMARY
   ========================================================= */

function updateAchievementSummary(
    results,
    xp,
    unlockedCount
) {

    const totalQuizzes =
        document.getElementById(
            "totalQuizzes"
        );

    const bestScore =
        document.getElementById(
            "bestScore"
        );

    const totalXP =
        document.getElementById(
            "totalXP"
        );

    const achievementCount =
        document.getElementById(
            "achievementCount"
        );

    const heroXP =
        document.getElementById(
            "heroXP"
        );

    const heroStreak =
        document.getElementById(
            "heroStreak"
        );

    const heroUnlocked =
        document.getElementById(
            "heroUnlocked"
        );


    const best =
        results.length
            ? Math.max(
                ...results.map(
                    result =>
                        Number(
                            result.percentage || 0
                        )
                )
            )
            : 0;


    const streak =
        calculateStreak(results);


    if (totalQuizzes) {
        totalQuizzes.textContent =
            results.length;
    }


    if (bestScore) {
        bestScore.textContent =
            `${Math.round(best)}%`;
    }


    if (totalXP) {
        totalXP.textContent =
            xp.toLocaleString();
    }


    if (achievementCount) {
        achievementCount.textContent =
            `${unlockedCount} / ${ACHIEVEMENTS.length}`;
    }


    if (heroXP) {
        heroXP.textContent =
            xp.toLocaleString();
    }


    if (heroStreak) {
        heroStreak.textContent =
            streak;
    }


    if (heroUnlocked) {
        heroUnlocked.textContent =
            unlockedCount;
    }


    updateAchievementProgress(
        unlockedCount
    );


    updateMotivation(
        results.length,
        unlockedCount,
        xp
    );
}


/* =========================================================
   OVERALL PROGRESS
   ========================================================= */

function updateAchievementProgress(
    unlockedCount
) {

    const percentage =
        Math.round(
            (unlockedCount /
                ACHIEVEMENTS.length) *
            100
        );


    const progressBar =
        document.getElementById(
            "achievementProgress"
        );


    const progressText =
        document.getElementById(
            "achievementProgressText"
        );


    if (progressBar) {

        progressBar.style.width =
            `${percentage}%`;
    }


    if (progressText) {

        progressText.textContent =
            `${percentage}% Complete`;
    }
}


/* =========================================================
   MOTIVATION
   ========================================================= */

function updateMotivation(
    quizCount,
    unlockedCount,
    xp
) {

    const element =
        document.getElementById(
            "motivationText"
        );


    if (!element) {
        return;
    }


    if (
        unlockedCount ===
        ACHIEVEMENTS.length
    ) {

        element.textContent =
            "Amazing! You've unlocked every achievement. You're a true QuizCloud champion!";

        return;
    }


    if (quizCount === 0) {

        element.textContent =
            "Take your first quiz and unlock your very first achievement!";

        return;
    }


    if (quizCount < 5) {

        element.textContent =
            `You have completed ${quizCount} quiz${
                quizCount === 1 ? "" : "zes"
            }. Complete ${
                5 - quizCount
            } more to unlock Quiz Explorer.`;

        return;
    }


    if (xp < 1000) {

        element.textContent =
            `You're making great progress! Earn ${
                (1000 - xp).toLocaleString()
            } more XP to unlock XP Hunter.`;

        return;
    }


    element.textContent =
        "Keep challenging yourself and unlock your next achievement!";
}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function setupMobileMenu() {

    const menuBtn =
        document.getElementById(
            "mobileMenuBtn"
        );

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    const overlay =
        document.getElementById(
            "mobileOverlay"
        );


    if (!menuBtn || !sidebar) {
        return;
    }


    function toggleMenu() {

        sidebar.classList.toggle(
            "mobile-open"
        );


        if (overlay) {

            overlay.classList.toggle(
                "active"
            );
        }
    }


    menuBtn.addEventListener(
        "click",
        toggleMenu
    );


    if (overlay) {

        overlay.addEventListener(
            "click",
            toggleMenu
        );
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutBtn) {
        return;
    }


    logoutBtn.addEventListener(
        "click",
        async function () {

            try {

                if (
                    typeof supabase !==
                    "undefined" &&
                    supabase &&
                    supabase.auth
                ) {

                    await supabase.auth.signOut();
                }

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );
            }


            localStorage.removeItem(
                "quizcloud_session"
            );

            localStorage.removeItem(
                "quizcloud_user"
            );


            window.location.href =
                "login.html";
        }
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initAchievements() {

    try {

        console.log(
            "🏆 Initializing QuizCloud Achievements..."
        );


        const user =
            await getCurrentUser();


        /*
           If no user is found, redirect to login.
           This is the ONLY place where the redirect happens.
        */

        if (!user || !user.id) {

            console.warn(
                "No authenticated user found. Redirecting to login."
            );

            window.location.href =
                "login.html";

            return;
        }


        console.log(
            "✅ Logged-in user:",
            user.email
        );


        await loadProfile(user);


        const results =
            await loadResults(user.id);


        console.log(
            "📊 Quiz results:",
            results
        );


        const xp =
            calculateXP(results);


        renderAchievements(
            results,
            xp
        );


        setupMobileMenu();

        setupLogout();


        console.log(
            "🏆 Achievements loaded successfully."
        );


    } catch (error) {

        console.error(
            "Achievements initialization error:",
            error
        );


        /*
           IMPORTANT:
           Do NOT redirect to login on a random
           JavaScript/API error.
        */

        const grid =
            document.getElementById(
                "achievementGrid"
            );


        if (grid) {

            grid.innerHTML = `

                <div style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:40px;
                ">

                    <i
                        class="fa-solid fa-triangle-exclamation"
                        style="
                            font-size:40px;
                            margin-bottom:15px;
                        "
                    ></i>

                    <h3>
                        Unable to load achievements
                    </h3>

                    <p>
                        Please refresh the page and try again.
                    </p>

                </div>

            `;
        }
    }
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initAchievements
);