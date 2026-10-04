const API_BASE = "http://localhost:5001/api";

let selectedEducationLevel = null;
let selectedStream = null;
let selectedSubject = null;
let selectedTopic = null;

const educationLevel = document.getElementById("educationLevel");
const stream = document.getElementById("stream");
const subject = document.getElementById("subject");
const topic = document.getElementById("topic");

const quizGrid = document.getElementById("quizGrid");
const quizCount = document.getElementById("quizCount");
const noQuizzesMessage = document.getElementById("noQuizzesMessage");
const loadingMessage = document.getElementById("loadingMessage");


/* =========================================================
   HELPERS
========================================================= */

function showLoading(show) {
    if (loadingMessage) {
        loadingMessage.style.display = show ? "block" : "none";
    }
}


function resetSelect(select, text) {
    if (!select) return;

    select.innerHTML = "";

    const option = document.createElement("option");
    option.value = "";
    option.textContent = text;

    select.appendChild(option);
}


function setSelectEnabled(select, enabled) {
    if (!select) return;

    select.disabled = !enabled;
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   LOAD EDUCATION LEVELS
========================================================= */

async function loadEducationLevels() {

    try {

        resetSelect(
            educationLevel,
            "Loading education levels..."
        );

        const response = await fetch(
            `${API_BASE}/admin/education-levels`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load education levels"
            );
        }

        resetSelect(
            educationLevel,
            "Select Education Level"
        );

        result.data.forEach(level => {

            const option = document.createElement("option");

            option.value = level.id;
            option.textContent = level.name;

            educationLevel.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Education level error:",
            error
        );

        resetSelect(
            educationLevel,
            "Unable to load education levels"
        );
    }
}


/* =========================================================
   LOAD STREAMS
========================================================= */

async function loadStreams(levelId) {

    resetSelect(
        stream,
        "Loading streams..."
    );

    setSelectEnabled(stream, false);

    resetSelect(
        subject,
        "Select stream first"
    );

    setSelectEnabled(subject, false);

    resetSelect(
        topic,
        "Select subject first"
    );

    setSelectEnabled(topic, false);

    clearQuizResults();

    if (!levelId) {
        resetSelect(
            stream,
            "Select education level first"
        );
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/admin/streams/${levelId}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load streams"
            );
        }

        resetSelect(
            stream,
            "Select Stream / Course"
        );

        result.data.forEach(item => {

            const option = document.createElement("option");

            option.value = item.id;
            option.textContent = item.name;

            stream.appendChild(option);

        });

        setSelectEnabled(stream, true);

    } catch (error) {

        console.error(
            "Stream error:",
            error
        );

        resetSelect(
            stream,
            "Unable to load streams"
        );
    }
}


/* =========================================================
   LOAD SUBJECTS
========================================================= */

async function loadSubjects(streamId) {

    resetSelect(
        subject,
        "Loading subjects..."
    );

    setSelectEnabled(subject, false);

    resetSelect(
        topic,
        "Select subject first"
    );

    setSelectEnabled(topic, false);

    clearQuizResults();

    if (!streamId) {
        resetSelect(
            subject,
            "Select stream first"
        );
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/admin/subjects/${streamId}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load subjects"
            );
        }

        resetSelect(
            subject,
            "Select Subject"
        );

        result.data.forEach(item => {

            const option = document.createElement("option");

            option.value = item.id;
            option.textContent = item.name;

            subject.appendChild(option);

        });

        setSelectEnabled(subject, true);

    } catch (error) {

        console.error(
            "Subject error:",
            error
        );

        resetSelect(
            subject,
            "Unable to load subjects"
        );
    }
}


/* =========================================================
   LOAD TOPICS
========================================================= */

async function loadTopics(subjectId) {

    resetSelect(
        topic,
        "Loading topics..."
    );

    setSelectEnabled(topic, false);

    clearQuizResults();

    if (!subjectId) {

        resetSelect(
            topic,
            "Select subject first"
        );

        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/admin/topics/${subjectId}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load topics"
            );
        }

        resetSelect(
            topic,
            "Select Topic"
        );

        result.data.forEach(item => {

            const option = document.createElement("option");

            option.value = item.id;
            option.textContent = item.name;

            topic.appendChild(option);

        });

        setSelectEnabled(topic, true);

    } catch (error) {

        console.error(
            "Topic error:",
            error
        );

        resetSelect(
            topic,
            "Unable to load topics"
        );
    }
}


/* =========================================================
   LOAD QUIZZES FOR SELECTED TOPIC
========================================================= */

async function loadQuizzesForTopic(topicId) {

    clearQuizResults();

    if (!topicId) {
        return;
    }

    showLoading(true);

    try {

        console.log(
            "Loading quizzes for topic:",
            topicId
        );

        const response = await fetch(
            `${API_BASE}/quizzes?topic_id=${encodeURIComponent(topicId)}`
        );

        const result = await response.json();

        console.log(
            "Quiz API response:",
            result
        );

        if (!response.ok || !result.success) {

            throw new Error(
                result.message || "Failed to load quizzes"
            );
        }

        const quizzes = Array.isArray(result.data)
            ? result.data
            : [];

        renderQuizzes(quizzes);

    } catch (error) {

        console.error(
            "Quiz loading error:",
            error
        );

        renderQuizError(error.message);

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   RENDER QUIZZES
========================================================= */

function renderQuizzes(quizzes) {

    if (!quizGrid) return;

    quizGrid.innerHTML = "";

    if (quizCount) {
        quizCount.textContent = quizzes.length;
    }

    if (
        noQuizzesMessage
    ) {
        noQuizzesMessage.style.display =
            quizzes.length === 0
                ? "block"
                : "none";
    }

    if (quizzes.length === 0) {

        quizGrid.innerHTML = `
            <div class="empty-quiz-state">

                <div class="empty-icon">
                    <i class="fa-solid fa-folder-open"></i>
                </div>

                <h3>No quizzes available</h3>

                <p>
                    There are currently no quizzes
                    available for this topic.
                </p>

            </div>
        `;

        return;
    }


    quizzes.forEach(quiz => {

        const card = document.createElement("article");

        card.className = "quiz-card";

        const questionCount =
            Number(
                quiz.question_count ||
                quiz.total_questions ||
                0
            );

        const difficulty =
            quiz.difficulty || "Medium";

        const access =
            quiz.access_type || "free";

        card.innerHTML = `

            <div class="quiz-card-top">

                <span class="quiz-category">
                    ${escapeHTML(
                        quiz.category || "Physics"
                    )}
                </span>

                <span class="quiz-difficulty">
                    ${escapeHTML(difficulty)}
                </span>

            </div>


            <h3>
                ${escapeHTML(
                    quiz.title || "Quiz"
                )}
            </h3>


            <p>
                ${escapeHTML(
                    quiz.description ||
                    "Test your knowledge."
                )}
            </p>


            <div class="quiz-card-meta">

                <span>
                    <i class="fa-solid fa-circle-question"></i>
                    ${questionCount} Questions
                </span>

                <span>
                    <i class="fa-solid fa-clock"></i>
                    ${Number(
                        quiz.time_limit || 15
                    )} min
                </span>

            </div>


            <button
                type="button"
                class="start-quiz-btn"
                data-quiz-id="${quiz.id}"
            >

                <span>
                    ${access === "premium"
                        ? "Start Premium Quiz"
                        : "Start Quiz"}
                </span>

                <i class="fa-solid fa-arrow-right"></i>

            </button>

        `;


        const startButton =
            card.querySelector(
                ".start-quiz-btn"
            );


        startButton.addEventListener(
            "click",
            function () {

                const quizId =
                    this.dataset.quizId;

                if (!quizId) {
                    alert(
                        "Quiz ID is missing."
                    );
                    return;
                }

                window.location.href =
                    `quiz.html?quiz_id=${quizId}`;
            }
        );


        quizGrid.appendChild(card);

    });
}


/* =========================================================
   ERROR
========================================================= */

function renderQuizError(message) {

    if (!quizGrid) return;

    if (quizCount) {
        quizCount.textContent = "0";
    }

    quizGrid.innerHTML = `

        <div class="empty-quiz-state">

            <div class="empty-icon">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h3>
                Unable to load quizzes
            </h3>

            <p>
                ${escapeHTML(
                    message ||
                    "Please check the backend server."
                )}
            </p>

            <button
                type="button"
                onclick="location.reload()"
            >
                <i class="fa-solid fa-rotate"></i>
                Try Again
            </button>

        </div>

    `;

}


/* =========================================================
   CLEAR QUIZZES
========================================================= */

function clearQuizResults() {

    if (quizCount) {
        quizCount.textContent = "0";
    }

    if (noQuizzesMessage) {
        noQuizzesMessage.style.display = "none";
    }

    if (quizGrid) {

        quizGrid.innerHTML = `

            <div class="empty-quiz-state">

                <div class="empty-icon">
                    <i class="fa-solid fa-compass"></i>
                </div>

                <h3>
                    Your next challenge is waiting
                </h3>

                <p>
                    Choose your topic above
                    to see available quizzes.
                </p>

            </div>

        `;
    }
}


/* =========================================================
   EVENTS
========================================================= */

if (educationLevel) {

    educationLevel.addEventListener(
        "change",
        async function () {

            selectedEducationLevel =
                this.value;

            await loadStreams(
                selectedEducationLevel
            );
        }
    );
}


if (stream) {

    stream.addEventListener(
        "change",
        async function () {

            selectedStream =
                this.value;

            await loadSubjects(
                selectedStream
            );
        }
    );
}


if (subject) {

    subject.addEventListener(
        "change",
        async function () {

            selectedSubject =
                this.value;

            await loadTopics(
                selectedSubject
            );
        }
    );
}


if (topic) {

    topic.addEventListener(
        "change",
        async function () {

            selectedTopic =
                this.value;

            await loadQuizzesForTopic(
                selectedTopic
            );
        }
    );
}


/* =========================================================
   BACK TO DASHBOARD
========================================================= */

const backDashboardBtn =
    document.getElementById(
        "backDashboardBtn"
    );

if (backDashboardBtn) {

    backDashboardBtn.addEventListener(
        "click",
        function () {

            window.location.href =
                "dashboard.html";

        }
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            clearQuizResults();

            await loadEducationLevels();

        } catch (error) {

            console.error(
                "Quiz selection initialization error:",
                error
            );

        }

    }
);