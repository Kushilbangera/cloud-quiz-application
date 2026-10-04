/* =========================================================
   QUIZCLOUD — MY PROGRESS
   Clean + Fast Progress Controller
========================================================= */

const API_BASE = "https://cloud-quiz-backend-o7t9.onrender.com/api";

let currentUser = null;
let allResults = [];


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("📊 QuizCloud Progress loading...");

    try {

        // Authentication
        if (typeof requireAuth === "function") {

            const allowed = requireAuth("user");

            if (!allowed) {
                return;
            }
        }


        // Get session
        if (typeof getSession === "function") {

            currentUser = getSession();

        } else {

            currentUser = JSON.parse(
                localStorage.getItem("quizcloud_session") || "null"
            );
        }


        if (!currentUser) {

            console.warn("No user session found.");

            showNoProgress();

            return;
        }


        console.log("👤 User:", currentUser);


        updateUserInformation();

        setupMobileMenu();

        setupLogout();

        setupPremiumButtons();

        setupPerformanceFilter();

        await loadProgress();


    } catch (error) {

        console.error(
            "❌ Progress initialization error:",
            error
        );

        showNoProgress();
    }

});


/* =========================================================
   USER
========================================================= */

function getUserId() {

    return (
        currentUser?.id ||
        currentUser?.user?.id ||
        currentUser?.user_id ||
        currentUser?.user?.user_id ||
        null
    );
}


function getUserName() {

    return (
        currentUser?.full_name ||
        currentUser?.name ||
        currentUser?.user?.user_metadata?.full_name ||
        currentUser?.user?.email?.split("@")[0] ||
        "Student"
    );
}


function getUserPlan() {

    return currentUser?.plan === "premium"
        ? "Premium Plan"
        : "Free Plan";
}


function updateUserInformation() {

    const name = getUserName();
    const plan = getUserPlan();


    const nameElement =
        document.getElementById("topUserName");

    const planElement =
        document.getElementById("topUserPlan");


    if (nameElement) {
        nameElement.textContent = name;
    }


    if (planElement) {
        planElement.textContent = plan;
    }


    // Avatar initials

    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();


    document
        .querySelectorAll(".profile-avatar")
        .forEach(avatar => {

            avatar.textContent = initials || "ST";

        });
}


/* =========================================================
   LOAD PROGRESS
========================================================= */

async function loadProgress() {

    const userId = getUserId();


    if (!userId) {

        console.error("User ID not found.");

        showNoProgress();

        return;
    }


    try {

        console.log(
            "📡 Loading progress for:",
            userId
        );


        const token = typeof getAccessToken === "function" ? getAccessToken() : null;
        const response = await fetch(
            `${API_BASE}/results/${encodeURIComponent(userId)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data = await response.json();


        console.log(
            "📊 Results:",
            data
        );


        if (Array.isArray(data)) {

            allResults = data;

        } else if (Array.isArray(data?.data)) {

            allResults = data.data;

        } else if (Array.isArray(data?.results)) {

            allResults = data.results;

        } else {

            allResults = [];
        }


        console.log(
            `✅ ${allResults.length} results loaded`
        );


        renderProgress();


    } catch (error) {

        console.error(
            "❌ Failed to load progress:",
            error
        );

        allResults = [];

        showNoProgress();
    }
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderProgress() {

    if (!allResults.length) {

        showNoProgress();

        return;
    }


    renderOverview();

    renderAccuracy();

    renderPerformanceChart();

    renderSubjectPerformance();

    renderStrengthsWeaknesses();

    renderRecentAttempts();
}


/* =========================================================
   OVERVIEW
========================================================= */

function renderOverview() {

    const totalQuizzes =
        allResults.length;


    const percentages =
        allResults
            .map(result =>
                Number(result.percentage ?? 0)
            )
            .filter(Number.isFinite);


    const averageAccuracy =
        percentages.length
            ? percentages.reduce(
                (sum, value) => sum + value,
                0
            ) / percentages.length
            : 0;


    const totalXP =
        calculateXP();


    const streak =
        calculateStreak();


    setText(
        "totalQuizzes",
        totalQuizzes
    );


    setText(
        "averageAccuracy",
        `${Math.round(averageAccuracy)}%`
    );


    setText(
        "totalXP",
        totalXP
    );


    setText(
        "currentStreak",
        `${streak} days`
    );
}


/* =========================================================
   XP
========================================================= */

function calculateXP() {

    let xp = 0;


    allResults.forEach(result => {

        const score =
            Number(result.score ?? 0);

        const percentage =
            Number(result.percentage ?? 0);


        // Base XP

        xp += Math.max(
            0,
            Math.round(score * 10)
        );


        // Performance bonus

        if (percentage >= 90) {

            xp += 50;

        } else if (percentage >= 80) {

            xp += 30;

        } else if (percentage >= 70) {

            xp += 20;
        }

    });


    return xp;
}


/* =========================================================
   ACCURACY
========================================================= */

function renderAccuracy() {

    let correct = 0;

    let total = 0;


    allResults.forEach(result => {

        correct += Number(
            result.score ?? 0
        );

        total += Number(
            result.total_questions ?? 0
        );

    });


    let accuracy = 0;


    if (total > 0) {

        accuracy =
            (correct / total) * 100;

    } else {

        const percentages =
            allResults
                .map(result =>
                    Number(
                        result.percentage ?? 0
                    )
                )
                .filter(Number.isFinite);


        if (percentages.length) {

            accuracy =
                percentages.reduce(
                    (sum, value) => sum + value,
                    0
                ) / percentages.length;
        }
    }


    const wrong =
        Math.max(
            0,
            total - correct
        );


    setText(
        "accuracyPercentage",
        `${Math.round(accuracy)}%`
    );


    setText(
        "correctAnswers",
        correct
    );


    setText(
        "wrongAnswers",
        wrong
    );


    // Circular chart

    const circle =
        document.querySelector(
            ".accuracy-circle"
        );


    if (circle) {

        const safeAccuracy =
            Math.min(
                100,
                Math.max(0, accuracy)
            );


        const degrees =
            safeAccuracy * 3.6;


        circle.style.background =
            `conic-gradient(
                #6755e8 ${degrees}deg,
                #eceaf5 ${degrees}deg
            )`;
    }
}


/* =========================================================
   PERFORMANCE CHART
========================================================= */

function setupPerformanceFilter() {

    const filter =
        document.getElementById(
            "performanceFilter"
        );


    if (!filter) {
        return;
    }


    filter.addEventListener(
        "change",
        renderPerformanceChart
    );
}


function renderPerformanceChart() {

    const container =
        document.getElementById(
            "performanceChart"
        );


    if (!container) {
        return;
    }


    if (!allResults.length) {

        container.innerHTML = `
            <div class="progress-empty">
                <i class="fas fa-chart-line"></i>
                <div>
                    Complete quizzes to see your performance.
                </div>
            </div>
        `;

        return;
    }


    const filter =
        document.getElementById(
            "performanceFilter"
        );


    let limit = 7;


    if (filter) {

        if (filter.value === "30") {
            limit = 30;
        }

        if (filter.value === "all") {
            limit = allResults.length;
        }
    }


    const results =
        [...allResults]
            .sort(
                (a, b) =>
                    new Date(
                        a.completed_at ||
                        a.created_at ||
                        0
                    ) -
                    new Date(
                        b.completed_at ||
                        b.created_at ||
                        0
                    )
            )
            .slice(-limit);


    const values =
        results.map(result =>
            Math.min(
                100,
                Math.max(
                    0,
                    Number(
                        result.percentage ?? 0
                    )
                )
            )
        );


    drawChart(
        container,
        values
    );
}


/* =========================================================
   SVG CHART
========================================================= */

function drawChart(container, values) {

    const width = 760;

    const height = 300;

    const paddingLeft = 50;

    const paddingRight = 25;

    const paddingTop = 20;

    const paddingBottom = 45;


    const chartWidth =
        width -
        paddingLeft -
        paddingRight;


    const chartHeight =
        height -
        paddingTop -
        paddingBottom;


    const count =
        Math.max(values.length, 1);


    const xStep =
        count === 1
            ? 0
            : chartWidth /
              (count - 1);


    const points =
        values.map(
            (value, index) => {

                const x =
                    paddingLeft +
                    index * xStep;


                const y =
                    paddingTop +
                    chartHeight -
                    (value / 100) *
                    chartHeight;


                return {
                    x,
                    y,
                    value
                };
            }
        );


    const linePoints =
        points
            .map(point =>
                `${point.x},${point.y}`
            )
            .join(" ");


    const areaPoints = values.length
        ? `
            ${paddingLeft},${paddingTop + chartHeight}
            ${linePoints}
            ${paddingLeft + (values.length - 1) * xStep},${paddingTop + chartHeight}
        `
        : "";


    const gridLines = [0, 25, 50, 75, 100]
        .map(value => {

            const y =
                paddingTop +
                chartHeight -
                (value / 100) *
                chartHeight;


            return `
                <line
                    x1="${paddingLeft}"
                    y1="${y}"
                    x2="${width - paddingRight}"
                    y2="${y}"
                    stroke="#eceaf4"
                    stroke-width="1"
                />

                <text
                    x="8"
                    y="${y + 4}"
                    font-size="11"
                    fill="#8b879c"
                >
                    ${value}%
                </text>
            `;
        })
        .join("");


    const circles =
        points
            .map(point => `
                <circle
                    cx="${point.x}"
                    cy="${point.y}"
                    r="5"
                    fill="#6755e8"
                    stroke="#ffffff"
                    stroke-width="3"
                />
            `)
            .join("");


    const labels =
        points
            .map(
                (point, index) => `
                    <text
                        x="${point.x}"
                        y="${height - 15}"
                        text-anchor="middle"
                        font-size="10"
                        fill="#8b879c"
                    >
                        ${index + 1}
                    </text>
                `
            )
            .join("");


    container.innerHTML = `

        <svg
            viewBox="0 0 ${width} ${height}"
            width="100%"
            height="300"
            preserveAspectRatio="none"
        >

            ${gridLines}

            ${
                values.length
                    ? `
                        <polygon
                            points="${areaPoints}"
                            fill="rgba(103,85,232,0.10)"
                        />

                        <polyline
                            points="${linePoints}"
                            fill="none"
                            stroke="#6755e8"
                            stroke-width="4"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />

                        ${circles}
                    `
                    : ""
            }

            ${labels}

        </svg>
    `;
}


/* =========================================================
   SUBJECT PERFORMANCE
========================================================= */

function renderSubjectPerformance() {

    const container =
        document.getElementById(
            "subjectPerformance"
        );


    if (!container) {
        return;
    }


    const subjects = {};


    allResults.forEach(result => {

        const subject =
            result.subject ||
            result.subject_name ||
            result.quiz?.subject ||
            result.quiz?.subject_name ||
            "General";


        const percentage =
            Number(
                result.percentage ?? 0
            );


        if (!subjects[subject]) {

            subjects[subject] = {
                total: 0,
                count: 0
            };
        }


        subjects[subject].total +=
            percentage;


        subjects[subject].count++;
    });


    const entries =
        Object.entries(subjects)
            .map(
                ([name, data]) => ({
                    name,
                    percentage:
                        data.count
                            ? data.total /
                              data.count
                            : 0
                })
            )
            .sort(
                (a, b) =>
                    b.percentage -
                    a.percentage
            );


    if (!entries.length) {

        container.innerHTML = `
            <div class="progress-empty">
                <i class="fas fa-book-open"></i>
                <div>
                    Complete quizzes to see subject performance.
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML =
        entries
            .map(item => {

                const percentage =
                    Math.round(
                        item.percentage
                    );


                return `
                    <div class="subject-row">

                        <div class="subject-name">
                            ${escapeHTML(item.name)}
                        </div>

                        <div class="subject-progress">

                            <div
                                class="subject-progress-bar"
                                style="width:${percentage}%"
                            ></div>

                        </div>

                        <div class="subject-score">
                            ${percentage}%
                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   STRENGTHS + WEAKNESSES
========================================================= */

function renderStrengthsWeaknesses() {

    const strengthList =
        document.getElementById(
            "strengthList"
        );


    const weaknessList =
        document.getElementById(
            "weaknessList"
        );


    if (!strengthList || !weaknessList) {
        return;
    }


    const subjects = {};


    allResults.forEach(result => {

        const subject =
            result.subject ||
            result.subject_name ||
            result.quiz?.subject ||
            result.quiz?.subject_name ||
            "General";


        const percentage =
            Number(
                result.percentage ?? 0
            );


        if (!subjects[subject]) {

            subjects[subject] = {
                total: 0,
                count: 0
            };
        }


        subjects[subject].total +=
            percentage;


        subjects[subject].count++;
    });


    const entries =
        Object.entries(subjects)
            .map(
                ([name, data]) => ({
                    name,
                    percentage:
                        data.total /
                        data.count
                })
            )
            .sort(
                (a, b) =>
                    b.percentage -
                    a.percentage
            );


    const strengths =
        entries
            .filter(item =>
                item.percentage >= 70
            )
            .slice(0, 3);


    const weaknesses =
        entries
            .filter(item =>
                item.percentage < 70
            )
            .slice(-3)
            .reverse();


    renderTopicList(
        strengthList,
        strengths,
        true
    );


    renderTopicList(
        weaknessList,
        weaknesses,
        false
    );
}


function renderTopicList(
    container,
    items,
    isStrength
) {

    if (!items.length) {

        container.innerHTML = `
            <div class="progress-empty">

                ${
                    isStrength
                        ? "Complete more quizzes to discover your strengths."
                        : "No major weak areas identified yet."
                }

            </div>
        `;

        return;
    }


    container.innerHTML =
        items
            .map(item => {

                const percentage =
                    Math.round(
                        item.percentage
                    );


                const icon =
                    isStrength
                        ? "fa-check"
                        : "fa-arrow-right";


                return `
                    <div class="insight-item">

                        <span>

                            <i
                                class="fas ${icon}"
                                style="margin-right:8px;"
                            ></i>

                            ${escapeHTML(item.name)}

                        </span>

                        <strong>
                            ${percentage}%
                        </strong>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   RECENT ATTEMPTS
========================================================= */

function renderRecentAttempts() {

    const container =
        document.getElementById(
            "recentAttempts"
        );


    if (!container) {
        return;
    }


    const attempts =
        [...allResults]
            .sort(
                (a, b) =>
                    new Date(
                        b.completed_at ||
                        b.created_at ||
                        0
                    ) -
                    new Date(
                        a.completed_at ||
                        a.created_at ||
                        0
                    )
            )
            .slice(0, 10);


    if (!attempts.length) {

        container.innerHTML = `
            <div class="progress-empty">

                <i class="fas fa-clipboard-list"></i>

                <h3>
                    No quiz attempts yet
                </h3>

                <p>
                    Complete your first quiz
                    to start tracking progress.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        attempts
            .map(result => {

                const quizName =
                    result.quiz_title ||
                    result.title ||
                    result.quiz?.title ||
                    `Quiz #${result.quiz_id ?? ""}`;


                const score =
                    Number(
                        result.score ?? 0
                    );


                const total =
                    Number(
                        result.total_questions ?? 0
                    );


                const percentage =
                    Number(
                        result.percentage ?? 0
                    );


                const date =
                    formatDate(
                        result.completed_at ||
                        result.created_at
                    );


                return `
                    <div class="attempt-row">

                        <div>

                            <div class="attempt-title">
                                ${escapeHTML(quizName)}
                            </div>

                            <div class="attempt-date">
                                ${date}
                            </div>

                        </div>


                        <div class="attempt-score">
                            ${score}/${total}
                        </div>


                        <div class="attempt-score">
                            ${Math.round(percentage)}%
                        </div>


                        <div class="attempt-status">
                            ${
                                percentage >= 70
                                    ? "Good"
                                    : "Keep Practicing"
                            }
                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   STREAK
========================================================= */

function calculateStreak() {

    const dateSet =
        new Set();


    allResults.forEach(result => {

        const rawDate =
            result.completed_at ||
            result.created_at;


        if (!rawDate) {
            return;
        }


        const date =
            new Date(rawDate);


        if (Number.isNaN(date.getTime())) {
            return;
        }


        dateSet.add(
            getDateKey(date)
        );
    });


    if (!dateSet.size) {
        return 0;
    }


    const dates =
        [...dateSet]
            .sort()
            .reverse();


    const today =
        new Date();


    const todayKey =
        getDateKey(today);


    const yesterday =
        new Date(today);


    yesterday.setDate(
        yesterday.getDate() - 1
    );


    const yesterdayKey =
        getDateKey(yesterday);


    if (
        dates[0] !== todayKey &&
        dates[0] !== yesterdayKey
    ) {

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


        const next =
            new Date(dates[i + 1]);


        const difference =
            Math.round(
                (
                    current - next
                ) /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );


        if (difference === 1) {

            streak++;

        } else {

            break;
        }
    }


    return streak;
}


function getDateKey(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    const menuButton =
        document.getElementById(
            "mobileMenuBtn"
        );


    if (
        !sidebar ||
        !menuButton
    ) {
        return;
    }


    menuButton.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "mobile-open"
            );


            if (overlay) {

                overlay.classList.toggle(
                    "active"
                );
            }
        }
    );


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMobileMenu
        );
    }


    document
        .querySelectorAll(
            ".sidebar-link"
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                closeMobileMenu
            );

        });


    function closeMobileMenu() {

        sidebar.classList.remove(
            "mobile-open"
        );


        if (overlay) {

            overlay.classList.remove(
                "active"
            );
        }
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
        () => {

            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            localStorage.removeItem(
                "quizcloud_session"
            );


            localStorage.removeItem(
                "session"
            );


            window.location.href =
                "login.html";
        }
    );
}


/* =========================================================
   PREMIUM
========================================================= */

function setupPremiumButtons() {

    const buttons = [

        document.getElementById(
            "sidebarUpgradeBtn"
        ),

        document.getElementById(
            "upgradeProgressBtn"
        ),

        document.getElementById(
            "modalUpgradeBtn"
        )

    ].filter(Boolean);


    const modal =
        document.getElementById(
            "premiumModal"
        );


    const closeButton =
        document.getElementById(
            "closePremiumModal"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                if (
                    currentUser?.plan ===
                    "premium"
                ) {

                    alert(
                        "Your Premium plan is already active 👑"
                    );

                    return;
                }


                if (
                    button.id ===
                    "modalUpgradeBtn"
                ) {

                    closePremiumModal();

                    await openRazorpayCheckout();

                    return;
                }


                openPremiumModal();

            }
        );

    });


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closePremiumModal
        );
    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    closePremiumModal();
                }
            }
        );
    }
}


function openPremiumModal() {

    const modal =
        document.getElementById(
            "premiumModal"
        );


    if (!modal) {
        return;
    }


    modal.style.display = "flex";

    modal.classList.add("show");
}


function closePremiumModal() {

    const modal =
        document.getElementById(
            "premiumModal"
        );


    if (!modal) {
        return;
    }


    modal.style.display = "none";

    modal.classList.remove("show");
}


/* =========================================================
   RAZORPAY
========================================================= */

function loadRazorpaySDK() {

    return new Promise(
        (resolve, reject) => {

            if (
                typeof Razorpay !==
                "undefined"
            ) {

                resolve();

                return;
            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://checkout.razorpay.com/v1/checkout.js";


            script.onload = resolve;


            script.onerror = () =>
                reject(
                    new Error(
                        "Razorpay SDK failed to load."
                    )
                );


            document
                .head
                .appendChild(script);
        }
    );
}


async function openRazorpayCheckout() {

    if (!currentUser) {

        alert(
            "Please log in to upgrade your plan."
        );

        return;
    }


    try {

        await loadRazorpaySDK();


        const orderResponse =
            await fetch(
                `${API_BASE}/payments/create-order`,
                {
                    method: "POST",

                    headers: typeof authHeaders === "function"
                        ? authHeaders({ "Content-Type": "application/json" })
                        : { "Content-Type": "application/json" },

                    body: JSON.stringify({

                        name:
                            getUserName(),

                        email:
                            currentUser.email ||
                            currentUser.user?.email ||
                            ""

                    })
                }
            );


        const orderData =
            await orderResponse.json();

        const order =
            orderData.data ||
            orderData.order ||
            orderData;

        if (
            !orderResponse.ok ||
            !orderData.success ||
            !order.id ||
            !order.key_id
        ) {

            throw new Error(
                orderData.message ||
                "Unable to create payment order."
            );
        }


        const options = {

            key:
                order.key_id,

            amount:
                order.amount,

            currency:
                order.currency,

            order_id:
                order.id,

            name:
                "QuizCloud Premium",

            description:
                "Premium QuizCloud Plan",


            prefill: {

                name:
                    getUserName(),

                email:
                    currentUser.email ||
                    currentUser.user?.email ||
                    ""

            },


            theme: {

                color:
                    "#6755e8"

            },


            handler:
                async function (response) {

                    await verifyPayment(
                        response,
                        order
                    );

                },


            modal: {

                ondismiss:
                    function () {

                        console.log(
                            "Payment window closed."
                        );
                    }

            }
        };


        const razorpay =
            new Razorpay(options);


        razorpay.on(
            "payment.failed",
            function () {

                alert(
                    "Payment failed. Please try again."
                );

            }
        );


        razorpay.open();


    } catch (error) {

        console.error(
            "❌ Razorpay error:",
            error
        );


        alert(
            error.message ||
            "Unable to start payment."
        );
    }
}


/* =========================================================
   VERIFY PAYMENT
========================================================= */

async function verifyPayment(
    paymentResponse,
    order
) {

    try {

        const response =
            await fetch(
                `${API_BASE}/payments/verify`,
                {
                    method: "POST",

                    headers: typeof authHeaders === "function"
                        ? authHeaders({ "Content-Type": "application/json" })
                        : { "Content-Type": "application/json" },

                    body: JSON.stringify({

                        razorpay_order_id:
                            paymentResponse
                                .razorpay_order_id,

                        razorpay_payment_id:
                            paymentResponse
                                .razorpay_payment_id,

                        razorpay_signature:
                            paymentResponse
                                .razorpay_signature,

                        email:
                            currentUser.email ||
                            currentUser.user?.email ||
                            "",

                        user_id:
                            getUserId()

                    })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Payment verification failed."
            );
        }


        // Update local session

        currentUser.plan =
            "premium";


        localStorage.setItem(
            "quizcloud_session",
            JSON.stringify(
                currentUser
            )
        );


        alert(
            "🎉 Premium activated successfully!"
        );


        closePremiumModal();


        updateUserInformation();


        location.reload();


    } catch (error) {

        console.error(
            "❌ Payment verification error:",
            error
        );


        alert(
            error.message ||
            "Payment verification failed."
        );
    }
}


/* =========================================================
   EMPTY STATE
========================================================= */

function showNoProgress() {

    setText(
        "totalQuizzes",
        "0"
    );


    setText(
        "averageAccuracy",
        "0%"
    );


    setText(
        "totalXP",
        "0"
    );


    setText(
        "currentStreak",
        "0 days"
    );


    setText(
        "accuracyPercentage",
        "0%"
    );


    setText(
        "correctAnswers",
        "0"
    );


    setText(
        "wrongAnswers",
        "0"
    );


    const chart =
        document.getElementById(
            "performanceChart"
        );


    if (chart) {

        chart.innerHTML = `
            <div class="progress-empty">

                <i class="fas fa-chart-line"></i>

                <div>
                    Complete your first quiz
                    to see your performance here.
                </div>

            </div>
        `;
    }


    const subject =
        document.getElementById(
            "subjectPerformance"
        );


    if (subject) {

        subject.innerHTML = `
            <div class="progress-empty">

                <i class="fas fa-book-open"></i>

                <div>
                    Complete quizzes to see
                    subject performance.
                </div>

            </div>
        `;
    }


    const strengths =
        document.getElementById(
            "strengthList"
        );


    if (strengths) {

        strengths.innerHTML = `
            <div class="progress-empty">
                Complete more quizzes to discover your strengths.
            </div>
        `;
    }


    const weaknesses =
        document.getElementById(
            "weaknessList"
        );


    if (weaknesses) {

        weaknesses.innerHTML = `
            <div class="progress-empty">
                Complete more quizzes to identify areas for improvement.
            </div>
        `;
    }


    const attempts =
        document.getElementById(
            "recentAttempts"
        );


    if (attempts) {

        attempts.innerHTML = `
            <div class="progress-empty">

                <i class="fas fa-clipboard-list"></i>

                <h3>
                    No quiz attempts yet
                </h3>

                <p>
                    Complete your first quiz
                    to start tracking progress.
                </p>

            </div>
        `;
    }


    const circle =
        document.querySelector(
            ".accuracy-circle"
        );


    if (circle) {

        circle.style.background =
            `conic-gradient(
                #eceaf5 0deg,
                #eceaf5 360deg
            )`;
    }
}


/* =========================================================
   UTILITIES
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;
    }
}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function escapeHTML(value) {

    return String(value ?? "")
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