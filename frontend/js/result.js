const resultData = JSON.parse(
    localStorage.getItem("quizResult")
);

const quizId = new URLSearchParams(window.location.search)
    .get("quiz_id");

if (!resultData) {

    alert("Result data not found.");

    window.location.href = "dashboard.html";

} else {

    const score = Number(resultData.score || 0);
    const total = Number(resultData.total_questions || 0);
    const percentage = Number(resultData.percentage || 0);

    const wrong = Number(resultData.wrong ?? Math.max(total - score - Number(resultData.unanswered || 0), 0));

    document.getElementById("percentage").textContent =
        `${percentage.toFixed(2)}%`;

    document.getElementById("correctAnswers").textContent =
        score;

    document.getElementById("wrongAnswers").textContent =
        wrong;

    document.getElementById("totalQuestions").textContent =
        total;

    if (resultData.quiz_title) {
        document.getElementById("quizTitle").textContent =
            resultData.quiz_title;
    }

    const performance =
        document.getElementById("performanceMessage");

    if (percentage >= 90) {
        performance.textContent =
            "🔥 Outstanding performance! Keep it up!";
    } else if (percentage >= 75) {
        performance.textContent =
            "👏 Great job! You're doing really well!";
    } else if (percentage >= 50) {
        performance.textContent =
            "👍 Good attempt! Keep practicing!";
    } else {
        performance.textContent =
            "💪 Keep learning and try again!";
    }
}


// Retake quiz
document.getElementById("retakeBtn")
    .addEventListener("click", () => {

        if (quizId) {
            window.location.href =
                `quiz.html?quiz_id=${quizId}`;
        } else {
            window.location.href =
                "dashboard.html";
        }

    });


// Dashboard
document.getElementById("dashboardBtn")
    .addEventListener("click", () => {

        window.location.href =
            "dashboard.html";

    });