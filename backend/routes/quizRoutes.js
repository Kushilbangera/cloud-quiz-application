const express = require("express");
const router = express.Router();

const {
    supabase,
    supabaseAdmin,
    createSupabaseAuthClient
} = require("../config/supabase");



async function getAuthenticatedUser(req) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    try {
        const authClient = createSupabaseAuthClient();
        const { data, error } = await authClient.auth.getUser(match[1]);
        return error ? null : (data?.user || null);
    } catch (error) {
        console.error("Authenticated user lookup error:", error);
        return null;
    }
}

/* =========================================================
   HELPER — GET USER PLAN
   ========================================================= */

async function getUserPlan(userId) {

    if (!userId) {
        return "free";
    }

    try {

        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("plan")
            .eq("id", userId)
            .single();

        if (error || !data) {
            return "free";
        }

        return data.plan || "free";

    } catch (error) {

        console.error("Get user plan error:", error);

        return "free";
    }
}


/* =========================================================
   HELPER — GET USER PROFILE
   ========================================================= */

async function getUserProfile(userId) {

    if (!userId) {
        return null;
    }

    try {

        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email, role, plan")
            .eq("id", userId)
            .single();

        if (error) {
            return null;
        }

        return data;

    } catch (error) {

        console.error("Get profile error:", error);

        return null;
    }
}


/* =========================================================
   HELPER — GET QUIZ DATA
   ========================================================= */

async function getQuizData(filters = {}) {

    try {

        let quizQuery = supabaseAdmin
            .from("quizzes")
            .select(`
                id,
                title,
                description,
                category,
                difficulty,
                total_questions,
                time_limit,
                created_at,
                subject_id,
                topic_id,
                access_type,
                published,
                premium_features
            `)
            .eq("published", true)
            .order("created_at", {
                ascending: false
            });

        /*
         * Filter by topic
         */
        if (filters.topic_id) {

            quizQuery = quizQuery.eq(
                "topic_id",
                filters.topic_id
            );
        }

        /*
         * Filter by subject
         */
        if (filters.subject_id) {

            quizQuery = quizQuery.eq(
                "subject_id",
                filters.subject_id
            );
        }

        /*
         * Filter by access type
         */
        if (filters.access_type) {

            quizQuery = quizQuery.eq(
                "access_type",
                filters.access_type
            );
        }

        const {
            data: quizzes,
            error: quizError
        } = await quizQuery;

        if (quizError) {

            console.error(
                "Quiz fetch error:",
                quizError
            );

            throw quizError;
        }

        if (!quizzes || quizzes.length === 0) {
            return [];
        }


        /* =====================================================
           GET QUESTIONS
           ===================================================== */

        const quizIds = quizzes.map(
            quiz => quiz.id
        );

        const {
            data: questions,
            error: questionError
        } = await supabaseAdmin
            .from("questions")
            .select(`
                id,
                quiz_id,
                question_text,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                explanation,
                marks,
                negative_marks,
                created_at
            `)
            .in("quiz_id", quizIds)
            .order("id", {
                ascending: true
            });

        if (questionError) {

            console.error(
                "Question fetch error:",
                questionError
            );

            throw questionError;
        }


        /* =====================================================
           COMBINE QUIZZES + QUESTIONS
           ===================================================== */

        const result = quizzes.map(quiz => {

            const quizQuestions =
                (questions || [])
                    .filter(
                        question =>
                            Number(question.quiz_id) ===
                            Number(quiz.id)
                    )
                    .map(question => {

                        return {

                            id: question.id,

                            question_text:
                                question.question_text,

                            question:
                                question.question_text,

                            options: {

                                A: question.option_a,

                                B: question.option_b,

                                C: question.option_c,

                                D: question.option_d
                            },

                            option_a:
                                question.option_a,

                            option_b:
                                question.option_b,

                            option_c:
                                question.option_c,

                            option_d:
                                question.option_d,

                            correct_answer:
                                question.correct_answer,

                            correctAnswer:
                                question.correct_answer,

                            explanation:
                                question.explanation || "",

                            marks:
                                Number(
                                    question.marks || 1
                                ),

                            negative_marks:
                                Number(
                                    question.negative_marks || 0
                                )
                        };
                    });


            return {

                id: quiz.id,

                title: quiz.title,

                description:
                    quiz.description || "",

                category:
                    quiz.category || "",

                difficulty:
                    quiz.difficulty || "medium",

                total_questions:
                    Number(
                        quiz.total_questions ||
                        quizQuestions.length
                    ),

                time_limit:
                    Number(
                        quiz.time_limit || 10
                    ),

                subject_id:
                    quiz.subject_id,

                topic_id:
                    quiz.topic_id,

                access_type:
                    quiz.access_type || "free",

                published:
                    quiz.published !== false,

                premium_features:
                    quiz.premium_features || {
                        explanations: false,
                        hints: false,
                        negative_marking: false,
                        advanced_analytics: false,
                        mock_exam: false,
                        certificate: false
                    },

                questions:
                    quizQuestions
            };

        });


        return result;

    } catch (error) {

        console.error(
            "getQuizData error:",
            error
        );

        throw error;
    }
}


/* =========================================================
   GET ALL QUIZZES
   =========================================================

   GET /api/quizzes

   Optional:
   ?topic_id=1
   ?subject_id=1
   ?access_type=free
   ?access_type=premium
   */

router.get("/quizzes", async (req, res) => {

    try {

        const {
            topic_id,
            subject_id,
            access_type
        } = req.query;


        const quizzes = await getQuizData({

            topic_id,

            subject_id,

            access_type
        });


        /*
         * IMPORTANT:
         *
         * We don't send correct answers
         * in the quiz listing.
         */

        const safeQuizzes =
            quizzes.map(quiz => {

                return {

                    id: quiz.id,

                    title: quiz.title,

                    description:
                        quiz.description,

                    category:
                        quiz.category,

                    difficulty:
                        quiz.difficulty,

                    total_questions:
                        quiz.total_questions,

                    time_limit:
                        quiz.time_limit,

                    subject_id:
                        quiz.subject_id,

                    topic_id:
                        quiz.topic_id,

                    access_type:
                        quiz.access_type,

                    published:
                        quiz.published,

                    premium_features:
                        quiz.premium_features,

                    question_count:
                        quiz.questions.length
                };

            });


        return res.json({

            success: true,

            count:
                safeQuizzes.length,

            data:
                safeQuizzes

        });

    } catch (error) {

        console.error(
            "GET /quizzes error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load quizzes"

        });

    }

});
// ==========================================
// LEADERBOARD
// GET /api/leaderboard
// ==========================================
router.get("/leaderboard", async (req, res) => {
    try {
        // Get quiz results
        const { data: results, error: resultsError } = await supabaseAdmin
            .from("results")
            .select(`
                user_id,
                score,
                total_questions,
                percentage,
                completed_at
            `)
            .order("percentage", { ascending: false });

        if (resultsError) {
            console.error("Leaderboard results error:", resultsError);

            return res.status(500).json({
                success: false,
                message: "Failed to load leaderboard"
            });
        }

        if (!results || results.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Get unique user IDs
        const userIds = [
            ...new Set(
                results
                    .map(result => result.user_id)
                    .filter(Boolean)
            )
        ];

        // Get profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

        if (profilesError) {
            console.error("Leaderboard profiles error:", profilesError);

            return res.status(500).json({
                success: false,
                message: "Failed to load leaderboard users"
            });
        }

        // Create profile lookup
        const profileMap = {};

        (profiles || []).forEach(profile => {
            profileMap[profile.id] = profile;
        });

        // Group results by user
        const leaderboardMap = {};

        results.forEach(result => {
            const userId = result.user_id;

            if (!userId) return;

            if (!leaderboardMap[userId]) {
                leaderboardMap[userId] = {
                    user_id: userId,
                    name:
                        profileMap[userId]?.full_name ||
                        profileMap[userId]?.email ||
                        "Quiz Player",
                    quizzes_completed: 0,
                    total_score: 0,
                    total_percentage: 0,
                    xp: 0
                };
            }

            leaderboardMap[userId].quizzes_completed += 1;

            leaderboardMap[userId].total_score +=
                Number(result.score || 0);

            leaderboardMap[userId].total_percentage +=
                Number(result.percentage || 0);

            // XP calculation
            leaderboardMap[userId].xp +=
                Number(result.score || 0) * 10;
        });

        // Calculate average percentage
        const leaderboard = Object.values(leaderboardMap).map(user => ({
            user_id: user.user_id,
            name: user.name,
            score:
                user.quizzes_completed > 0
                    ? Math.round(
                        user.total_percentage /
                        user.quizzes_completed
                    )
                    : 0,
            percentage:
                user.quizzes_completed > 0
                    ? Number(
                        (
                            user.total_percentage /
                            user.quizzes_completed
                        ).toFixed(2)
                    )
                    : 0,
            quizzes_completed: user.quizzes_completed,
            xp: user.xp
        }));

        // Highest average percentage first
        leaderboard.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return b.xp - a.xp;
        });

        // Top 50 players
        const topPlayers = leaderboard
            .slice(0, 50)
            .map((player, index) => ({
                rank: index + 1,
                ...player
            }));

        res.json({
            success: true,
            data: topPlayers
        });

    } catch (error) {
        console.error("Leaderboard server error:", error);

        res.status(500).json({
            success: false,
            message: "Server error while loading leaderboard"
        });
    }
});


/* =========================================================
   PREMIUM STATUS
   =========================================================

   GET /api/quizzes/premium-status/:userId
   */

router.get(
    "/quizzes/premium-status/:userId",
    async (req, res) => {

        try {

            const userId =
                req.params.userId;


            const profile =
                await getUserProfile(userId);


            if (!profile) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            const isPremium =
                profile.plan === "premium";


            return res.json({

                success: true,

                user_id:
                    profile.id,

                plan:
                    profile.plan,

                is_premium:
                    isPremium,

                features: {

                    unlimited_quizzes:
                        isPremium,

                    premium_quizzes:
                        isPremium,

                    explanations:
                        isPremium,

                    hints:
                        isPremium,

                    negative_marking:
                        isPremium,

                    advanced_analytics:
                        isPremium,

                    mock_exams:
                        isPremium,

                    certificates:
                        isPremium,

                    advanced_leaderboard:
                        isPremium

                }

            });

        } catch (error) {

            console.error(
                "Premium status error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to check premium status"

            });

        }

    }
);


/* =========================================================
   EXPORT
   ========================================================= */


/* =========================================================
   SUBMIT QUIZ — SERVER SIDE SCORING
   POST /api/quizzes/:id/submit
   ========================================================= */
router.post("/quizzes/:id/submit", async (req, res) => {
    try {
        const authenticatedUser = await getAuthenticatedUser(req);
        if (!authenticatedUser) {
            return res.status(401).json({ success: false, message: "Please sign in before submitting a quiz." });
        }

        const quizId = Number(req.params.id);
        const answers = req.body?.answers && typeof req.body.answers === "object"
            ? req.body.answers
            : {};
        if (!quizId) return res.status(400).json({ success: false, message: "Invalid quiz ID." });

        const { data: quiz, error: quizError } = await supabaseAdmin
            .from("quizzes")
            .select("id, title, access_type, published, total_questions")
            .eq("id", quizId)
            .eq("published", true)
            .maybeSingle();
        if (quizError) throw quizError;
        if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found." });

        const plan = await getUserPlan(authenticatedUser.id);
        if (quiz.access_type === "premium" && plan !== "premium") {
            return res.status(403).json({ success: false, premium_required: true, message: "This quiz is available only for Premium users." });
        }

        const { data: questions, error: questionError } = await supabaseAdmin
            .from("questions")
            .select("id, correct_answer, marks")
            .eq("quiz_id", quizId)
            .order("id", { ascending: true });
        if (questionError) throw questionError;
        if (!questions?.length) return res.status(400).json({ success: false, message: "No questions have been added to this quiz yet." });

        let correct = 0;
        let wrong = 0;
        let unanswered = 0;
        let score = 0;
        for (const question of questions) {
            const answer = String(answers[question.id] || "").trim().toUpperCase();
            if (!answer) { unanswered++; continue; }
            if (answer === String(question.correct_answer || "").toUpperCase()) {
                correct++;
                score += Number(question.marks || 1);
            } else {
                wrong++;
            }
        }
        const total = questions.length;
        const percentage = total ? Number(((correct / total) * 100).toFixed(2)) : 0;

        const { data: saved, error: saveError } = await supabaseAdmin
            .from("results")
            .insert({
                user_id: authenticatedUser.id,
                quiz_id: quizId,
                score: Math.round(score),
                total_questions: total,
                percentage
            })
            .select()
            .single();
        if (saveError) throw saveError;

        return res.status(201).json({
            success: true,
            message: "Quiz submitted successfully.",
            data: {
                result_id: saved.id,
                quiz_id: quizId,
                quiz_title: quiz.title,
                score: Math.round(score),
                total_questions: total,
                percentage,
                correct,
                wrong,
                unanswered
            }
        });
    } catch (error) {
        console.error("Quiz submission error:", error);
        return res.status(500).json({ success: false, message: "Unable to submit quiz." });
    }
});

/* =========================================================
   GET SINGLE QUIZ
   =========================================================

   GET /api/quizzes/:id

   Example:

   /api/quizzes/1

   Free user:
   /api/quizzes/1?user_id=USER_ID

   Premium user:
   /api/quizzes/1?user_id=USER_ID
   */

router.get("/quizzes/:id", async (req, res) => {

    try {

        const quizId =
            Number(req.params.id);

        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        /*
         * Get user ID.
         *
         * For now the frontend sends user_id
         * from its authenticated session.
         */

        const authenticatedUser = await getAuthenticatedUser(req);
        const userId = authenticatedUser?.id || null;


        /*
         * Get user plan.
         */

        const plan =
            await getUserPlan(userId);


        /*
         * Get quiz.
         */

        const quizzes =
            await getQuizData();


        const quiz =
            quizzes.find(
                item =>
                    Number(item.id) === quizId
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"

            });

        }


        const isPremiumQuiz =
            quiz.access_type === "premium";


        const isPremiumUser =
            plan === "premium";


        /* =====================================================
           PREMIUM PROTECTION
           ===================================================== */

        if (
            isPremiumQuiz &&
            !isPremiumUser
        ) {

            return res.status(403).json({

                success: false,

                premium_required: true,

                message:
                    "This quiz is available only for Premium users.",

                quiz: {

                    id:
                        quiz.id,

                    title:
                        quiz.title,

                    description:
                        quiz.description,

                    difficulty:
                        quiz.difficulty,

                    total_questions:
                        quiz.total_questions,

                    time_limit:
                        quiz.time_limit,

                    access_type:
                        "premium"

                }

            });

        }


        /* =====================================================
           PREPARE QUESTIONS
           ===================================================== */

        const safeQuestions =
            quiz.questions.map(question => {

                return {

                    id:
                        question.id,

                    question:
                        question.question_text,

                    options:
                        question.options,

                    marks:
                        question.marks,

                    /*
                     * Negative marking is available
                     * only for Premium.
                     */

                    negative_marks:
                        isPremiumUser
                            ? question.negative_marks
                            : 0,

                    /*
                     * Explanations are Premium.
                     */

                    explanation:
                        isPremiumUser
                            ? question.explanation
                            : null

                };

            });


        /* =====================================================
           PREMIUM FEATURES
           ===================================================== */

        const premiumFeatures =
            isPremiumUser

                ? quiz.premium_features

                : {

                    explanations: false,

                    hints: false,

                    negative_marking: false,

                    advanced_analytics: false,

                    mock_exam: false,

                    certificate: false

                };


        return res.json({

            success: true,

            plan:

                plan,

            is_premium:

                isPremiumUser,

            is_premium_quiz:

                isPremiumQuiz,

            premium_features:

                premiumFeatures,

            data: {

                id:
                    quiz.id,

                title:
                    quiz.title,

                description:
                    quiz.description,

                category:
                    quiz.category,

                difficulty:
                    quiz.difficulty,

                total_questions:
                    quiz.total_questions,

                time_limit:
                    quiz.time_limit,

                subject_id:
                    quiz.subject_id,

                topic_id:
                    quiz.topic_id,

                access_type:
                    quiz.access_type,

                questions:
                    safeQuestions

            }

        });

    } catch (error) {

        console.error(
            "GET /quizzes/:id error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load quiz"

        });

    }

});


/* =========================================================
   SAVE QUIZ RESULT
   =========================================================

   POST /api/results
   */

router.post("/results", async (req, res) => {

    try {

        const {
            quiz_id,
            score,
            total_questions,
            percentage
        } = req.body;

        const authenticatedUser = await getAuthenticatedUser(req);
        const user_id = authenticatedUser?.id;


        if (

            !user_id ||

            !quiz_id ||

            score === undefined ||

            !total_questions ||

            percentage === undefined

        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Missing required result details"

            });

        }


        /*
         * Check whether user exists.
         */

        const profile =
            await getUserProfile(user_id);


        if (!profile) {

            return res.status(404).json({

                success: false,

                message:
                    "User profile not found"

            });

        }


        /*
         * Save result.
         */

        const {
            data,
            error
        } = await supabaseAdmin

            .from("results")

            .insert([{

                user_id,

                quiz_id,

                score,

                total_questions,

                percentage

            }])

            .select()

            .single();


        if (error) {

            console.error(
                "Result save error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to save result"

            });

        }


        return res.status(201).json({

            success: true,

            message:
                "Result saved successfully",

            data

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Server error"

        });

    }

});


/* =========================================================
   USER QUIZ HISTORY
   =========================================================

   GET /api/results/:userId
   */

router.get(
    "/results/:userId",
    async (req, res) => {

        try {

            const authenticatedUser = await getAuthenticatedUser(req);
            if (!authenticatedUser) {
                return res.status(401).json({ success: false, message: "Authentication required." });
            }
            const userId = authenticatedUser.id;


            const {
                data,
                error
            } = await supabaseAdmin

                .from("results")

                .select(`
                    id,
                    user_id,
                    quiz_id,
                    score,
                    total_questions,
                    percentage,
                    completed_at
                `)

                .eq(
                    "user_id",
                    userId
                )

                .order(
                    "completed_at",
                    {
                        ascending: false
                    }
                );


            if (error) {

                console.error(
                    "Result history error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load result history"

                });

            }


            return res.json({

                success: true,

                count:
                    data.length,

                data

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message:
                    "Server error"

            });

        }

    }
);



module.exports = router;