const API_BASE = "http://localhost:5001/api";

let currentUser = null;
let currentPlan = "free";
let premiumModal = null;


/* =========================================================
   AUTH / SESSION
========================================================= */

function getStoredAuth() {
    const keys = [
        "quizcloud_user",
        "quizcloud_session",
        "session"
    ];

    for (const key of keys) {
        try {
            const raw = localStorage.getItem(key);

            if (!raw) continue;

            const parsed = JSON.parse(raw);

            if (parsed) {
                return parsed;
            }
        } catch (error) {
            console.warn(`Could not read ${key}:`, error);
        }
    }

    return null;
}


function getUserId() {
    const auth = getStoredAuth();

    return (
        auth?.id ||
        auth?.user_id ||
        auth?.user?.id ||
        auth?.session?.user?.id ||
        null
    );
}


function getAccessToken() {
    const auth = getStoredAuth();

    return (
        auth?.accessToken ||
        auth?.access_token ||
        auth?.token ||
        auth?.session?.accessToken ||
        auth?.session?.access_token ||
        auth?.user?.accessToken ||
        auth?.user?.access_token ||
        null
    );
}


function getAuthHeaders() {
    const token = getAccessToken();

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    currentUser = getStoredAuth();

    if (!getUserId()) {
        window.location.href = "login.html";
        return;
    }

    initializeDashboard();

    await loadUserProfile();
    await loadQuizzes();
    await loadLeaderboard();

    setupPremiumButtons();
    setupMobileSidebar();
    setupNavigation();
});


/* =========================================================
   DASHBOARD INITIALIZATION
========================================================= */

function initializeDashboard() {

    premiumModal =
        document.getElementById("premiumModal");

    updateUserUI();

    updatePlanUI();
}


/* =========================================================
   USER UI
========================================================= */

function updateUserUI() {

    const auth = getStoredAuth();

    if (!auth) {
        return;
    }

    const user =
        auth.user || auth;

    const name =
        user.full_name ||
        user.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Student";

    const email =
        user.email ||
        "";

    const elements = {

        welcomeName:
            document.getElementById("welcomeName"),

        userName:
            document.getElementById("userName"),

        profileName:
            document.getElementById("profileName"),

        userEmail:
            document.getElementById("userEmail"),

        profileEmail:
            document.getElementById("profileEmail")
    };


    if (elements.welcomeName) {
        elements.welcomeName.textContent =
            name;
    }

    if (elements.userName) {
        elements.userName.textContent =
            name;
    }

    if (elements.profileName) {
        elements.profileName.textContent =
            name;
    }

    if (elements.userEmail) {
        elements.userEmail.textContent =
            email;
    }

    if (elements.profileEmail) {
        elements.profileEmail.textContent =
            email;
    }
}


/* =========================================================
   LOAD USER PROFILE / PLAN
========================================================= */

async function loadUserProfile() {

    const userId =
        getUserId();

    if (!userId) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/profile/${encodeURIComponent(userId)}`,
                {
                    headers:
                        getAuthHeaders()
                }
            );


        if (!response.ok) {
            return;
        }


        const result =
            await response
                .json()
                .catch(() => ({}));


        const profile =
            result.data ||
            result.profile ||
            result;


        currentPlan =
            profile?.plan ||
            "free";


        updatePlanUI();

    } catch (error) {

        console.warn(
            "Profile loading failed:",
            error
        );

        /*
            Do not break dashboard if
            profile endpoint is unavailable.
        */

        const auth =
            getStoredAuth();

        currentPlan =
            auth?.plan ||
            auth?.user?.plan ||
            "free";

        updatePlanUI();
    }
}


/* =========================================================
   PLAN UI
========================================================= */

function updatePlanUI() {

    const isPremium =
        String(currentPlan).toLowerCase() ===
        "premium";


    const planLabels =
        document.querySelectorAll(
            ".plan-label, #planLabel, #currentPlan"
        );


    planLabels.forEach(element => {

        element.textContent =
            isPremium
                ? "Premium"
                : "Free";

    });


    const premiumButtons =
        document.querySelectorAll(
            "#upgradeBtn, #sidebarUpgradeBtn, #upgradeProgressBtn"
        );


    premiumButtons.forEach(button => {

        if (isPremium) {

            button.textContent =
                "Premium Active";

            button.disabled = true;

        } else {

            button.textContent =
                "Upgrade to Premium";

            button.disabled = false;
        }
    });


    const premiumBanner =
        document.getElementById(
            "premiumBanner"
        );


    if (premiumBanner) {

        premiumBanner.style.display =
            isPremium
                ? "none"
                : "";
    }
}


/* =========================================================
   QUIZZES
========================================================= */

async function loadQuizzes() {

    const grid =
        document.getElementById(
            "quizGrid"
        );

    try {

        const response =
            await fetch(
                `${API_BASE}/quizzes`,
                {
                    headers:
                        getAuthHeaders()
                }
            );


        const result =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Failed to load quizzes"
            );
        }


        const quizzes =
            result.data ||
            result.quizzes ||
            [];


        renderQuizzes(quizzes);

    } catch (error) {

        console.error(
            "Quiz loading error:",
            error
        );


        if (grid) {

            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <h3>Unable to load quizzes</h3>
                    <p>Please make sure the backend is running.</p>
                </div>
            `;
        }
    }
}


function renderQuizzes(quizzes) {

    const grid =
        document.getElementById(
            "quizGrid"
        );


    if (!grid) {
        return;
    }


    if (!Array.isArray(quizzes) ||
        quizzes.length === 0) {

        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-book-open"></i>
                <h3>No quizzes available</h3>
                <p>New quizzes will appear here soon.</p>
            </div>
        `;

        return;
    }


    grid.innerHTML = "";


    quizzes.forEach((quiz, index) => {

        const card =
            document.createElement("div");

        card.className =
            "quiz-card";


        const title =
            quiz.title ||
            `Quiz ${index + 1}`;


        const category =
            quiz.category ||
            quiz.subject ||
            "General";


        const difficulty =
            quiz.difficulty ||
            "Medium";


        const totalQuestions =
            quiz.total_questions ||
            quiz.questions_count ||
            0;


        const accessType =
            String(
                quiz.access_type ||
                "free"
            ).toLowerCase();


        const isPremium =
            accessType === "premium";


        card.innerHTML = `
            <div class="quiz-card-icon">
                <i class="fa-solid fa-brain"></i>
            </div>

            <div class="quiz-card-content">

                <span class="quiz-category">
                    ${escapeHTML(category)}
                </span>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    ${escapeHTML(
                        quiz.description ||
                        "Test your knowledge and improve your skills."
                    )}
                </p>

                <div class="quiz-meta">

                    <span>
                        <i class="fa-solid fa-list-check"></i>
                        ${totalQuestions} Questions
                    </span>

                    <span>
                        <i class="fa-solid fa-gauge-high"></i>
                        ${escapeHTML(difficulty)}
                    </span>

                </div>

                <button
                    type="button"
                    class="start-quiz-btn"
                    data-quiz-id="${quiz.id}"
                    data-access-type="${isPremium ? "premium" : "free"}"
                >
                    ${
                        isPremium
                            ? '<i class="fa-solid fa-crown"></i> Premium Quiz'
                            : '<i class="fa-solid fa-play"></i> Start Quiz'
                    }
                </button>

            </div>
        `;


        const button =
            card.querySelector(
                ".start-quiz-btn"
            );


        button.addEventListener(
            "click",
            () => {

                if (
                    isPremium &&
                    String(currentPlan).toLowerCase() !==
                    "premium"
                ) {

                    openPremiumModal();

                    return;
                }


                window.location.href =
                    `quiz.html?quiz_id=${encodeURIComponent(
                        quiz.id
                    )}`;
            }
        );


        grid.appendChild(card);
    });
}


/* =========================================================
   LEADERBOARD
========================================================= */

async function loadLeaderboard() {

    const container =
        document.getElementById(
            "leaderboardPreview"
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/leaderboard`,
                {
                    headers:
                        getAuthHeaders()
                }
            );


        if (!response.ok) {
            throw new Error(
                "Leaderboard unavailable"
            );
        }


        const result =
            await response
                .json()
                .catch(() => ({}));


        const leaderboard =
            result.data ||
            result.leaderboard ||
            [];


        renderLeaderboard(
            leaderboard
        );

    } catch (error) {

        console.warn(
            "Leaderboard loading error:",
            error
        );


        container.innerHTML = `
            <div class="leaderboard-empty">
                <i class="fa-solid fa-trophy"></i>
                <p>Leaderboard is unavailable right now.</p>
            </div>
        `;
    }
}


function renderLeaderboard(data) {

    const container =
        document.getElementById(
            "leaderboardPreview"
        );


    if (!container) {
        return;
    }


    if (!Array.isArray(data) ||
        data.length === 0) {

        container.innerHTML = `
            <div class="leaderboard-empty">
                <i class="fa-solid fa-trophy"></i>
                <p>No leaderboard data yet.</p>
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    data
        .slice(0, 5)
        .forEach((player, index) => {

            const name =
                player.name ||
                player.full_name ||
                player.email ||
                "Student";


            const score =
                player.score ??
                player.percentage ??
                0;


            const xp =
                player.xp ??
                Number(score) * 10;


            const row =
                document.createElement("div");

            row.className =
                "leaderboard-row";


            row.innerHTML = `
                <div class="leaderboard-rank">
                    ${index + 1}
                </div>

                <div class="leaderboard-avatar">
                    ${escapeHTML(
                        name.charAt(0).toUpperCase()
                    )}
                </div>

                <div class="leaderboard-player">
                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                    <span>
                        ${xp} XP
                    </span>
                </div>

                <div class="leaderboard-score">
                    ${score}
                </div>
            `;


            container.appendChild(row);
        });
}


/* =========================================================
   PREMIUM MODAL
========================================================= */

function openPremiumModal() {

    if (
        String(currentPlan).toLowerCase() ===
        "premium"
    ) {

        alert(
            "Your Premium plan is already active."
        );

        return;
    }


    const modal =
        document.getElementById(
            "premiumModal"
        );


    if (!modal) {

        console.error(
            "premiumModal not found in dashboard.html"
        );

        return;
    }


    /*
        IMPORTANT:
        dashboard.html starts this modal with
        display:none, so we explicitly change it.
    */

    modal.style.display =
        "flex";


    modal.classList.add(
        "show"
    );


    document.body.classList.add(
        "modal-open"
    );
}


function closePremiumModal() {

    const modal =
        document.getElementById(
            "premiumModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    modal.style.display =
        "none";


    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   RAZORPAY
========================================================= */

async function loadRazorpayScript() {

    if (
        typeof Razorpay !==
        "undefined"
    ) {
        return true;
    }


    return new Promise((resolve) => {

        const existing =
            document.querySelector(
                'script[src*="checkout.razorpay.com"]'
            );


        if (existing) {

            existing.addEventListener(
                "load",
                () => resolve(true)
            );

            existing.addEventListener(
                "error",
                () => resolve(false)
            );

            return;
        }


        const script =
            document.createElement(
                "script"
            );


        script.src =
            "https://checkout.razorpay.com/v1/checkout.js";


        script.onload = () => {

            console.log(
                "Razorpay Checkout loaded successfully"
            );

            resolve(true);
        };


        script.onerror = () => {

            console.error(
                "Failed to load Razorpay Checkout"
            );

            resolve(false);
        };


        document.head.appendChild(
            script
        );
    });
}


async function startRazorpayPayment() {

    if (
        String(currentPlan).toLowerCase() ===
        "premium"
    ) {

        alert(
            "You already have Premium."
        );

        return;
    }


    const userId =
        getUserId();


    const token =
        getAccessToken();


    if (!userId || !token) {

        alert(
            "Your login session has expired. Please login again."
        );

        window.location.href =
            "login.html";

        return;
    }


    const button =
        document.getElementById(
            "modalUpgradeBtn"
        );


    const originalText =
        button
            ? button.innerHTML
            : "Upgrade to Premium";


    try {

        if (button) {

            button.disabled =
                true;

            button.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Creating order...';
        }


        /*
            Load Razorpay Checkout first.
        */

        const razorpayLoaded =
            await loadRazorpayScript();


        if (!razorpayLoaded) {

            throw new Error(
                "Razorpay Checkout could not be loaded. Check your internet connection or browser extensions."
            );
        }


        /*
            CREATE ORDER
        */

        const orderResponse =
            await fetch(
                `${API_BASE}/payments/create-order`,
                {
                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    body: JSON.stringify({
                        user_id: userId,
                        amount: 49900,
                        currency: "INR"
                    })
                }
            );


        const orderData =
            await orderResponse
                .json()
                .catch(() => ({}));


        console.log(
            "Razorpay order response:",
            orderData
        );


        if (!orderResponse.ok) {

            throw new Error(
                orderData.message ||
                "Unable to create Razorpay order."
            );
        }


        const order =
            orderData.data ||
            orderData;


        if (!order.id) {

            throw new Error(
                "Razorpay order ID was not returned by the server."
            );
        }


        if (!order.key_id) {

            throw new Error(
                "Razorpay Test Key ID was not returned by the server."
            );
        }


        /*
            RAZORPAY CHECKOUT
        */

        const options = {

            key:
                order.key_id,

            amount:
                order.amount,

            currency:
                order.currency ||
                "INR",

            name:
                "QuizCloud",

            description:
                "QuizCloud Premium Plan",

            order_id:
                order.id,

            prefill: {

                name:
                    getUserName(),

                email:
                    getUserEmail()
            },

            notes: {

                user_id:
                    userId,

                plan:
                    "premium"
            },


            theme: {

                color:
                    "#6c4df6"
            },


            handler:
                async function (
                    paymentResponse
                ) {

                    await verifyRazorpayPayment(
                        paymentResponse,
                        button,
                        originalText
                    );
                },


            modal: {

                ondismiss:
                    function () {

                        console.log(
                            "Razorpay checkout closed."
                        );

                        if (button) {

                            button.disabled =
                                false;

                            button.innerHTML =
                                originalText;
                        }
                    }
            }
        };


        const razorpay =
            new Razorpay(
                options
            );


        razorpay.on(
            "payment.failed",
            function (response) {

                console.error(
                    "Razorpay payment failed:",
                    response
                );


                alert(
                    response.error?.description ||
                    "Payment failed. Please try again."
                );


                if (button) {

                    button.disabled =
                        false;

                    button.innerHTML =
                        originalText;
                }
            }
        );


        razorpay.open();


    } catch (error) {

        console.error(
            "Razorpay error:",
            error
        );


        alert(
            error.message ||
            "Unable to start payment."
        );


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                originalText;
        }
    }
}


/* =========================================================
   VERIFY PAYMENT
========================================================= */

async function verifyRazorpayPayment(
    paymentResponse,
    button,
    originalText
) {

    try {

        if (button) {

            button.disabled =
                true;

            button.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Verifying payment...';
        }


        const userId =
            getUserId();


        const response =
            await fetch(
                `${API_BASE}/payments/verify`,
                {
                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    body: JSON.stringify({

                        user_id:
                            userId,

                        razorpay_order_id:
                            paymentResponse.razorpay_order_id,

                        razorpay_payment_id:
                            paymentResponse.razorpay_payment_id,

                        razorpay_signature:
                            paymentResponse.razorpay_signature
                    })
                }
            );


        const result =
            await response
                .json()
                .catch(() => ({}));


        console.log(
            "Payment verification response:",
            result
        );


        if (!response.ok ||
            !result.success) {

            throw new Error(
                result.message ||
                "Payment verification failed."
            );
        }


        /*
            Update local session
        */

        updateLocalPlan(
            "premium"
        );


        currentPlan =
            "premium";


        updatePlanUI();


        closePremiumModal();


        alert(
            "🎉 Payment successful! Your QuizCloud Premium plan is now active."
        );


        /*
            Reload dashboard data.
        */

        await loadUserProfile();
        await loadQuizzes();


    } catch (error) {

        console.error(
            "Payment verification error:",
            error
        );


        alert(
            error.message ||
            "Payment verification failed."
        );


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                originalText;
        }
    }
}


/* =========================================================
   UPDATE LOCAL PLAN
========================================================= */

function updateLocalPlan(plan) {

    const keys = [
        "quizcloud_user",
        "quizcloud_session",
        "session"
    ];


    keys.forEach(key => {

        try {

            const raw =
                localStorage.getItem(
                    key
                );


            if (!raw) {
                return;
            }


            const parsed =
                JSON.parse(raw);


            if (parsed.user) {

                parsed.user.plan =
                    plan;
            }


            parsed.plan =
                plan;


            localStorage.setItem(
                key,
                JSON.stringify(parsed)
            );


        } catch (error) {

            console.warn(
                `Could not update ${key}:`,
                error
            );
        }
    });
}


/* =========================================================
   USER HELPERS
========================================================= */

function getUserName() {

    const auth =
        getStoredAuth();


    const user =
        auth?.user ||
        auth;


    return (
        user?.full_name ||
        user?.name ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "QuizCloud User"
    );
}


function getUserEmail() {

    const auth =
        getStoredAuth();


    const user =
        auth?.user ||
        auth;


    return (
        user?.email ||
        ""
    );
}


/* =========================================================
   PREMIUM BUTTONS
========================================================= */

function setupPremiumButtons() {

    /*
        Main upgrade buttons
    */

    const upgradeButtons =
        document.querySelectorAll(
            "#upgradeBtn, #sidebarUpgradeBtn, #upgradeProgressBtn"
        );


    upgradeButtons.forEach(button => {

        button.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openPremiumModal();
            }
        );
    });


    /*
        Premium modal close
    */

    const closeButton =
        document.getElementById(
            "closePremiumModal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                closePremiumModal();
            }
        );
    }


    /*
        Click outside modal
    */

    const modal =
        document.getElementById(
            "premiumModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    modal
                ) {

                    closePremiumModal();
                }
            }
        );
    }


    /*
        ESC key
    */

    document.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Escape"
            ) {

                closePremiumModal();
            }
        }
    );


    /*
        REAL RAZORPAY BUTTON
    */

    const modalUpgradeButton =
        document.getElementById(
            "modalUpgradeBtn"
        );


    if (modalUpgradeButton) {

        modalUpgradeButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                startRazorpayPayment();
            }
        );
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const startQuizBtn =
        document.getElementById(
            "startQuizBtn"
        );


    if (startQuizBtn) {

        startQuizBtn.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                window.location.href =
                    "quiz-selection.html";
            }
        );
    }


    const educationCards =
        document.querySelectorAll(
            ".education-card"
        );


    educationCards.forEach(card => {

        card.addEventListener(
            "click",
            function() {

                window.location.href =
                    "quiz-selection.html";
            }
        );
    });


    const myProgressLink =
        document.getElementById(
            "myProgressLink"
        );


    if (myProgressLink) {

        myProgressLink.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                window.location.href =
                    "progress.html";
            }
        );
    }


    const achievementsLink =
        document.getElementById(
            "achievementsLink"
        );


    if (achievementsLink) {

        achievementsLink.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                window.location.href =
                    "achievements.html";
            }
        );
    }
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function setupMobileSidebar() {

    const menuButton =
        document.getElementById(
            "mobileMenuBtn"
        );


    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    if (!menuButton ||
        !sidebar) {

        return;
    }


    menuButton.addEventListener(
        "click",
        function() {

            sidebar.classList.toggle(
                "open"
            );


            if (overlay) {

                overlay.classList.toggle(
                    "show"
                );
            }
        }
    );


    if (overlay) {

        overlay.addEventListener(
            "click",
            function() {

                sidebar.classList.remove(
                    "open"
                );

                overlay.classList.remove(
                    "show"
                );
            }
        );
    }
}


/* =========================================================
   LOGOUT
========================================================= */

function logoutUser() {

    localStorage.removeItem(
        "quizcloud_user"
    );

    localStorage.removeItem(
        "quizcloud_session"
    );

    localStorage.removeItem(
        "session"
    );

    localStorage.removeItem(
        "quizResult"
    );

    window.location.href =
        "login.html";
}


document.addEventListener(
    "click",
    function(event) {

        const logoutButton =
            event.target.closest(
                "#logoutBtn, .logout-btn, [data-action='logout']"
            );


        if (logoutButton) {

            event.preventDefault();

            logoutUser();
        }
    }
);


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}