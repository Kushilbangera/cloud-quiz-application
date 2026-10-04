const API_BASE = "http://localhost:5001/api";

let leaderboardData = [];


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    await loadLeaderboard();

    setupTabs();

});


// ==========================================
// LOAD LEADERBOARD
// ==========================================

async function loadLeaderboard() {

    const loadingState =
        document.getElementById("loadingState");

    const emptyState =
        document.getElementById("emptyState");

    const rankingList =
        document.getElementById("rankingList");

    try {

        const response =
            await fetch(`${API_BASE}/leaderboard`);

        const result =
            await response.json();

        console.log("Leaderboard:", result);

        if (!response.ok || !result.success) {
            throw new Error(
                result.message ||
                "Failed to load leaderboard"
            );
        }

        leaderboardData =
            Array.isArray(result.data)
                ? result.data
                : [];

        loadingState.classList.add("hidden");

        if (leaderboardData.length === 0) {

            emptyState.classList.remove("hidden");

            document
                .getElementById("podiumSection")
                .style.display = "none";

            return;
        }

        renderStats();

        renderPodium();

        renderRanking();

        rankingList.classList.remove("hidden");

    } catch (error) {

        console.error(
            "Leaderboard error:",
            error
        );

        loadingState.classList.add("hidden");

        emptyState.classList.remove("hidden");

        document
            .querySelector("#emptyState h3")
            .textContent =
            "Unable to load leaderboard";

        document
            .querySelector("#emptyState p")
            .textContent =
            "Please make sure the backend server is running.";

    }

}


// ==========================================
// PODIUM
// ==========================================

function renderPodium() {

    const first =
        leaderboardData[0];

    const second =
        leaderboardData[1];

    const third =
        leaderboardData[2];


    if (first) {

        document.getElementById("firstName")
            .textContent = first.name || "Player";

        document.getElementById("firstScore")
            .textContent =
            Number(first.score || first.percentage || 0);

        document.getElementById("firstAvatar")
            .textContent =
            getInitials(first.name);

    }


    if (second) {

        document.getElementById("secondName")
            .textContent = second.name || "Player";

        document.getElementById("secondScore")
            .textContent =
            Number(second.score || second.percentage || 0);

        document.getElementById("secondAvatar")
            .textContent =
            getInitials(second.name);

    }


    if (third) {

        document.getElementById("thirdName")
            .textContent = third.name || "Player";

        document.getElementById("thirdScore")
            .textContent =
            Number(third.score || third.percentage || 0);

        document.getElementById("thirdAvatar")
            .textContent =
            getInitials(third.name);

    }

}


// ==========================================
// STATS
// ==========================================

function renderStats() {

    const playerCount =
        leaderboardData.length;

    const totalXP =
        leaderboardData.reduce(
            (total, player) =>
                total +
                Number(player.xp || 0),
            0
        );

    const topScore =
        Math.max(
            ...leaderboardData.map(
                player =>
                    Number(
                        player.score ||
                        player.percentage ||
                        0
                    )
            )
        );


    document.getElementById("playerCount")
        .textContent = playerCount;

    document.getElementById("totalXP")
        .textContent = formatNumber(totalXP);

    document.getElementById("topScore")
        .textContent = `${topScore}%`;

}


// ==========================================
// RANKING
// ==========================================

function renderRanking() {

    const rankingList =
        document.getElementById("rankingList");

    rankingList.innerHTML = "";


    leaderboardData.forEach(
        (player, index) => {

            const rank =
                player.rank || index + 1;

            const score =
                Number(
                    player.score ||
                    player.percentage ||
                    0
                );

            const xp =
                Number(player.xp || score * 10);


            const row =
                document.createElement("div");

            row.className =
                "ranking-row";


            if (rank <= 3) {

                row.classList.add(
                    `top-${rank}`
                );

            }


            row.innerHTML = `

                <div class="rank-number">
                    ${getRankIcon(rank)}
                </div>

                <div class="ranking-player">

                    <div class="ranking-avatar">
                        ${getInitials(player.name)}
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(
                                player.name ||
                                "Quiz Player"
                            )}
                        </strong>

                        <span>
                            ${player.quizzes_completed || 0}
                            quizzes completed
                        </span>

                    </div>

                </div>

                <div class="ranking-score">

                    <span>
                        Score
                    </span>

                    <strong>
                        ${score}%
                    </strong>

                </div>

                <div class="ranking-xp">

                    <i class="fas fa-bolt"></i>

                    ${formatNumber(xp)} XP

                </div>

            `;

            rankingList.appendChild(row);

        }
    );

}


// ==========================================
// RANK ICON
// ==========================================

function getRankIcon(rank) {

    if (rank === 1) {
        return `<i class="fas fa-crown"></i>`;
    }

    if (rank === 2) {
        return `<i class="fas fa-medal"></i>`;
    }

    if (rank === 3) {
        return `<i class="fas fa-medal"></i>`;
    }

    return `#${rank}`;

}


// ==========================================
// INITIALS
// ==========================================

function getInitials(name) {

    if (!name) {
        return "?";
    }

    const words =
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2);

    return words
        .map(word =>
            word.charAt(0).toUpperCase()
        )
        .join("");

}


// ==========================================
// NUMBER FORMAT
// ==========================================

function formatNumber(number) {

    return Number(number || 0)
        .toLocaleString("en-IN");

}


// ==========================================
// HTML SAFETY
// ==========================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ==========================================
// TABS
// ==========================================

function setupTabs() {

    const tabs =
        document.querySelectorAll(".tab");

    tabs.forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                tabs.forEach(t =>
                    t.classList.remove("active")
                );

                tab.classList.add("active");

                const period =
                    tab.dataset.period;

                console.log(
                    "Selected leaderboard:",
                    period
                );

                /*
                 * Global currently uses:
                 * GET /api/leaderboard
                 *
                 * Weekly / Monthly can later
                 * have separate backend filters.
                 */

            }
        );

    });

}