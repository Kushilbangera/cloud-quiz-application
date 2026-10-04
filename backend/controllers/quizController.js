// ============================================
// CLOUD QUIZ APPLICATION
// QUIZ CONTROLLER
// ============================================

const { supabaseAdmin } = require("../config/supabase");


// ============================================
// GET ALL QUIZZES
// ============================================

const getQuizzes = async (req, res) => {

    try {

        const {
            topic_id,
            subject_id,
            access_type,
            difficulty
        } = req.query;


        // ----------------------------------------
        // Get quizzes
        // ----------------------------------------

        let query = supabaseAdmin
            .from("quizzes")
            .select(`
                id,
                title,
                description,
                category,
                difficulty,
                total_questions,
                time_limit,
                access_type,
                published,
                subject_id,
                topic_id,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        // ----------------------------------------
        // Only published quizzes
        // ----------------------------------------

        query = query.eq(
            "published",
            true
        );


        // ----------------------------------------
        // Filter by topic
        // ----------------------------------------

        if (topic_id) {

            query = query.eq(
                "topic_id",
                topic_id
            );
        }


        // ----------------------------------------
        // Filter by subject
        // ----------------------------------------

        if (subject_id) {

            query = query.eq(
                "subject_id",
                subject_id
            );
        }


        // ----------------------------------------
        // Filter by access type
        // ----------------------------------------

        if (access_type) {

            query = query.eq(
                "access_type",
                access_type
            );
        }


        // ----------------------------------------
        // Filter by difficulty
        // ----------------------------------------

        if (difficulty) {

            query = query.eq(
                "difficulty",
                difficulty
            );
        }


        const {
            data,
            error
        } = await query;


        if (error) {

            console.error(
                "Get quizzes error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load quizzes",

                error:
                    error.message
            });
        }


        // ----------------------------------------
        // Response
        // ----------------------------------------

        return res.json({

            success: true,

            count:
                data?.length || 0,

            data:
                data || []
        });


    } catch (error) {

        console.error(
            "Quiz controller error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error"
        });
    }
};


// ============================================
// GET SINGLE QUIZ
// ============================================

const getQuizById = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Quiz ID is required"
            });
        }


        // ----------------------------------------
        // Get quiz
        // ----------------------------------------

        const {
            data: quiz,
            error: quizError
        } = await supabaseAdmin
            .from("quizzes")
            .select(`
                id,
                title,
                description,
                category,
                difficulty,
                total_questions,
                time_limit,
                access_type,
                published,
                subject_id,
                topic_id,
                created_at
            `)
            .eq(
                "id",
                id
            )
            .single();


        if (quizError) {

            console.error(
                "Quiz fetch error:",
                quizError
            );

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"
            });
        }


        // ----------------------------------------
        // Get questions
        // ----------------------------------------

        const {
            data: questions,
            error: questionsError
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
            .eq(
                "quiz_id",
                id
            )
            .order(
                "id",
                {
                    ascending: true
                }
            );


        if (questionsError) {

            console.error(
                "Questions fetch error:",
                questionsError
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load quiz questions"
            });
        }


        return res.json({

            success: true,

            data: {

                ...quiz,

                questions:
                    questions || []
            }
        });


    } catch (error) {

        console.error(
            "Get quiz by ID error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error"
        });
    }
};


// ============================================
// GET QUESTIONS BY QUIZ
// ============================================

const getQuestionsByQuiz = async (
    req,
    res
) => {

    try {

        const {
            quizId
        } = req.params;


        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Quiz ID is required"
            });
        }


        const {
            data,
            error
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
            .eq(
                "quiz_id",
                quizId
            )
            .order(
                "id",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Question fetch error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load questions",

                error:
                    error.message
            });
        }


        return res.json({

            success: true,

            count:
                data?.length || 0,

            data:
                data || []
        });


    } catch (error) {

        console.error(
            "Get questions error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error"
        });
    }
};


// ============================================
// SAVE QUIZ RESULT
// ============================================

const saveResult = async (
    req,
    res
) => {

    try {

        const {
            user_id,
            quiz_id,
            score,
            total_questions,
            percentage
        } = req.body;


        // ----------------------------------------
        // Validation
        // ----------------------------------------

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


        // ----------------------------------------
        // Save result
        // ----------------------------------------

        const {
            data,
            error
        } = await supabaseAdmin
            .from("results")
            .insert([

                {
                    user_id,
                    quiz_id,
                    score,
                    total_questions,
                    percentage
                }

            ])
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
                    "Failed to save result",

                error:
                    error.message
            });
        }


        return res.status(201).json({

            success: true,

            message:
                "Result saved successfully",

            data
        });


    } catch (error) {

        console.error(
            "Save result error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error"
        });
    }
};


// ============================================
// EXPORT
// ============================================

module.exports = {

    getQuizzes,

    getQuizById,

    getQuestionsByQuiz,

    saveResult

};