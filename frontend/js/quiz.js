const API_BASE = "https://cloud-quiz-backend-o7t9.onrender.com/api";
let quizId = null;
let quizData = null;
let questions = [];
let currentQuestion = 0;
let userAnswers = {};
let timeRemaining = 600;
let timerInterval = null;
let submitting = false;


/* =========================================================
   GET QUIZ ID
========================================================= */

function getQuizId() {
    const params = new URLSearchParams(window.location.search);

    return (
        params.get("quiz_id") ||
        params.get("quiz") ||
        params.get("id")
    );
}


/* =========================================================
   AUTH HELPERS
========================================================= */

function getStoredAuth() {
    const possibleKeys = [
        "quizcloud_user",
        "quizcloud_session",
        "session"
    ];

    for (const key of possibleKeys) {
        try {
            const raw = localStorage.getItem(key);

            if (!raw) continue;

            const parsed = JSON.parse(raw);

            if (parsed) {
                return parsed;
            }
        } catch (error) {
            console.warn(`Unable to read ${key}:`, error);
        }
    }

    return null;
}


function getToken() {
    const stored = getStoredAuth();

    if (!stored) {
        return null;
    }

    /*
        Different possible Supabase/session formats
    */

    return (
        stored.accessToken ||
        stored.access_token ||
        stored.token ||
        stored.session?.accessToken ||
        stored.session?.access_token ||
        stored.user?.accessToken ||
        stored.user?.access_token ||
        null
    );
}


function getUserId() {
    const stored = getStoredAuth();

    if (!stored) {
        return null;
    }

    return (
        stored.id ||
        stored.user_id ||
        stored.user?.id ||
        stored.session?.user?.id ||
        null
    );
}


function headers() {
    const token = getToken();

    const result = {
        "Content-Type": "application/json"
    };

    if (token) {
        result.Authorization = `Bearer ${token}`;
    }

    return result;
}


/* =========================================================
   CHECK LOGIN
========================================================= */

function isLoggedIn() {
    const userId = getUserId();
    const token = getToken();

    return Boolean(userId && token);
}


/* =========================================================
   LOAD QUIZ
========================================================= */

async function loadQuiz() {

    quizId = getQuizId();

    if (!quizId) {
        showError("Quiz ID is missing.");
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/quizzes/${encodeURIComponent(quizId)}`,
            {
                method: "GET",
                headers: headers()
            }
        );

        const result = await response
            .json()
            .catch(() => ({}));


        if (
            response.status === 403 &&
            result.premium_required
        ) {
            showError(
                result.message ||
                "This quiz requires Premium."
            );

            return;
        }


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                `Quiz API returned ${response.status}`
            );
        }


        quizData = result.data;

        questions = Array.isArray(
            quizData.questions
        )
            ? quizData.questions
            : [];


        if (!questions.length) {

            showError(
                "No questions have been added to this quiz yet."
            );

            return;
        }


        const quizTitle =
            document.getElementById("quizTitle");

        if (quizTitle) {
            quizTitle.textContent =
                quizData.title || "Cloud Quiz";
        }


        timeRemaining =
            Number(quizData.time_limit || 10) * 60;


        createQuestionPalette();

        showQuestion(0);

        startTimer();

    } catch (error) {

        console.error(
            "Quiz loading error:",
            error
        );

        showError(
            error.message ||
            "Unable to load quiz. Please check the backend."
        );
    }
}


/* =========================================================
   ERROR DISPLAY
========================================================= */

function showError(message) {

    const questionText =
        document.getElementById("questionText");

    if (questionText) {
        questionText.textContent = message;
    }


    const options =
        document.getElementById("optionsContainer");

    if (options) {

        options.innerHTML = `
            <div class="quiz-error">
                ${escapeHTML(message)}
            </div>
        `;
    }


    const next =
        document.getElementById("nextBtn");

    const previous =
        document.getElementById("previousBtn");

    const submit =
        document.getElementById("submitBtn");


    if (next) {
        next.disabled = true;
    }

    if (previous) {
        previous.disabled = true;
    }

    if (submit) {
        submit.disabled = true;
    }
}


/* =========================================================
   SHOW QUESTION
========================================================= */

function showQuestion(index) {

    if (
        index < 0 ||
        index >= questions.length
    ) {
        return;
    }


    currentQuestion = index;

    const question =
        questions[index];


    const badge =
        document.getElementById("questionBadge");

    const number =
        document.getElementById("questionNumber");

    const text =
        document.getElementById("questionText");

    const fill =
        document.getElementById("progressFill");

    const percent =
        document.getElementById("progressPercent");


    if (badge) {
        badge.textContent =
            `Question ${index + 1}`;
    }


    if (number) {
        number.textContent =
            `Question ${index + 1} of ${questions.length}`;
    }


    if (text) {
        text.textContent =
            question.question ||
            question.question_text ||
            "Question unavailable";
    }


    const pct =
        ((index + 1) / questions.length) * 100;


    if (fill) {
        fill.style.width = `${pct}%`;
    }


    if (percent) {
        percent.textContent =
            `${Math.round(pct)}%`;
    }


    const container =
        document.getElementById(
            "optionsContainer"
        );

    if (!container) {
        return;
    }


    container.innerHTML = "";


    const options =
        question.options || {
            A: question.option_a,
            B: question.option_b,
            C: question.option_c,
            D: question.option_d
        };


    Object.entries(options).forEach(
        ([letter, optionText]) => {

            if (
                optionText === null ||
                optionText === undefined ||
                optionText === ""
            ) {
                return;
            }


            const option =
                document.createElement("button");

            option.type = "button";


            option.className =
                "option" +
                (
                    userAnswers[question.id] === letter
                        ? " selected"
                        : ""
                );


            option.innerHTML = `
                <span class="option-label">
                    ${escapeHTML(letter)}
                </span>

                <span>
                    ${escapeHTML(optionText)}
                </span>
            `;


            option.addEventListener(
                "click",
                () => selectAnswer(letter)
            );


            container.appendChild(option);
        }
    );


    updateNavigation();

    updatePalette();
}


/* =========================================================
   SELECT ANSWER
========================================================= */

function selectAnswer(answer) {

    const question =
        questions[currentQuestion];


    if (!question || submitting) {
        return;
    }


    userAnswers[question.id] =
        answer;


    showQuestion(currentQuestion);
}


/* =========================================================
   NAVIGATION
========================================================= */

function updateNavigation() {

    const previous =
        document.getElementById("previousBtn");

    const next =
        document.getElementById("nextBtn");


    if (previous) {
        previous.disabled =
            currentQuestion === 0;
    }


    if (next) {
        next.disabled =
            currentQuestion ===
            questions.length - 1;
    }
}


function nextQuestion() {

    if (
        currentQuestion <
        questions.length - 1
    ) {
        showQuestion(
            currentQuestion + 1
        );
    }
}


function previousQuestion() {

    if (currentQuestion > 0) {

        showQuestion(
            currentQuestion - 1
        );
    }
}


/* =========================================================
   QUESTION PALETTE
========================================================= */

function createQuestionPalette() {

    const palette =
        document.getElementById(
            "questionPalette"
        );


    if (!palette) {
        return;
    }


    palette.innerHTML = "";


    questions.forEach(
        (_, index) => {

            const button =
                document.createElement("button");


            button.type = "button";

            button.textContent =
                index + 1;

            button.className =
                "question-number";


            button.addEventListener(
                "click",
                () => showQuestion(index)
            );


            palette.appendChild(button);
        }
    );


    updatePalette();
}


function updatePalette() {

    const palette =
        document.getElementById(
            "questionPalette"
        );


    if (!palette) {
        return;
    }


    palette
        .querySelectorAll("button")
        .forEach(
            (button, index) => {

                const question =
                    questions[index];


                button.classList.toggle(
                    "answered",
                    Boolean(
                        question &&
                        userAnswers[question.id]
                    )
                );


                button.classList.toggle(
                    "active",
                    index === currentQuestion
                );
            }
        );
}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    clearInterval(timerInterval);

    updateTimer();


    timerInterval =
        setInterval(() => {

            timeRemaining -= 1;

            updateTimer();


            if (timeRemaining <= 0) {

                clearInterval(
                    timerInterval
                );

                submitQuiz(true);
            }

        }, 1000);
}


function updateTimer() {

    const timer =
        document.getElementById("timer");


    if (!timer) {
        return;
    }


    const minutes =
        Math.floor(
            Math.max(
                timeRemaining,
                0
            ) / 60
        );


    const seconds =
        Math.max(
            timeRemaining,
            0
        ) % 60;


    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


    if (timeRemaining <= 60) {

        timer.classList.add(
            "timer-warning"
        );
    }
}


/* =========================================================
   SUBMIT QUIZ
========================================================= */

async function submitQuiz(autoSubmit = false) {

    if (
        submitting ||
        !questions.length
    ) {
        return;
    }


    /*
        IMPORTANT:
        Get both user ID and access token.
    */

    const userId =
        getUserId();

    const token =
        getToken();


    console.log(
        "Quiz submit authentication:",
        {
            userId: userId,
            hasToken: Boolean(token)
        }
    );


    /*
        If user is genuinely not logged in,
        send them to login.
    */

    if (!userId || !token) {

        alert(
            "Your login session is missing or expired. Please log in again."
        );

        window.location.href =
            "login.html";

        return;
    }


    submitting = true;

    clearInterval(
        timerInterval
    );


    const submitBtn =
        document.getElementById(
            "submitBtn"
        );


    if (submitBtn) {

        submitBtn.disabled = true;

        submitBtn.textContent =
            "Submitting...";
    }


    if (autoSubmit) {

        alert(
            "Time is up! Your quiz will be submitted now."
        );
    }


    try {

        console.log(
            "Submitting quiz:",
            quizId
        );

        console.log(
            "Answers:",
            userAnswers
        );


        const response =
            await fetch(
                `${API_BASE}/quizzes/${encodeURIComponent(quizId)}/submit`,
                {
                    method: "POST",

                    headers: {
                        ...headers(),
                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        answers: userAnswers
                    })
                }
            );


        const payload =
            await response
                .json()
                .catch(() => ({}));


        console.log(
            "Submit response:",
            payload
        );


        /*
            PREMIUM ACCESS
        */

        if (
            response.status === 403 &&
            payload.premium_required
        ) {

            alert(
                payload.message ||
                "Premium access required."
            );


            submitting = false;


            if (submitBtn) {

                submitBtn.disabled =
                    false;

                submitBtn.textContent =
                    "Submit Quiz";
            }


            return;
        }


        /*
            UNAUTHORIZED
        */

        if (
            response.status === 401
        ) {

            alert(
                "Your login session has expired. Please log in again."
            );


            localStorage.removeItem(
                "quizcloud_user"
            );

            localStorage.removeItem(
                "quizcloud_session"
            );

            localStorage.removeItem(
                "session"
            );


            window.location.href =
                "login.html";


            return;
        }


        /*
            SERVER ERROR
        */

        if (!response.ok) {

            throw new Error(
                payload.message ||
                `Submit failed with status ${response.status}`
            );
        }


        /*
            BACKEND SUCCESS CHECK
        */

        if (!payload.success) {

            throw new Error(
                payload.message ||
                "Failed to submit quiz."
            );
        }


        /*
            RESULT DATA
        */

        const result =
            payload.data || payload;


        console.log(
            "Quiz result:",
            result
        );


        /*
            Save result locally
            for result.html
        */

        const resultData = {

            quiz_id:
                Number(
                    quizId
                ),

            score:
                Number(
                    result.score || 0
                ),

            total_questions:
                Number(
                    result.total_questions ||
                    questions.length
                ),

            percentage:
                Number(
                    result.percentage || 0
                ),

            correct:
                Number(
                    result.correct || 0
                ),

            wrong:
                Number(
                    result.wrong || 0
                ),

            unanswered:
                Number(
                    result.unanswered || 0
                )
        };


        localStorage.setItem(
            "quizResult",
            JSON.stringify(resultData)
        );


        /*
            Go to result page
        */

        window.location.href =
            `result.html?quiz_id=${encodeURIComponent(quizId)}`;


    } catch (error) {

        console.error(
            "Quiz submit error:",
            error
        );


        alert(
            error.message ||
            "Unable to submit quiz. Please try again."
        );


        submitting = false;


        if (submitBtn) {

            submitBtn.disabled =
                false;

            submitBtn.textContent =
                "Submit Quiz";
        }
    }
}


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


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
            Previous button
        */

        document
            .getElementById(
                "previousBtn"
            )
            ?.addEventListener(
                "click",
                previousQuestion
            );


        /*
            Next button
        */

        document
            .getElementById(
                "nextBtn"
            )
            ?.addEventListener(
                "click",
                nextQuestion
            );


        /*
            Submit button
        */

        document
            .getElementById(
                "submitBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    /*
                        If your page has a confirmation
                        modal, open it.
                    */

                    const modal =
                        document.getElementById(
                            "submitModal"
                        );


                    if (modal) {

                        modal.classList.remove(
                            "hidden"
                        );

                    } else {

                        /*
                            If no modal exists,
                            submit directly.
                        */

                        submitQuiz(false);
                    }
                }
            );


        /*
            Cancel submit
        */

        document
            .getElementById(
                "cancelSubmit"
            )
            ?.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "submitModal"
                        )
                        ?.classList.add(
                            "hidden"
                        );
                }
            );


        /*
            Confirm submit
        */

        document
            .getElementById(
                "confirmSubmit"
            )
            ?.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "submitModal"
                        )
                        ?.classList.add(
                            "hidden"
                        );


                    submitQuiz(false);
                }
            );


        /*
            Load quiz
        */

        loadQuiz();
    }
);