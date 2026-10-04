const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");

const { supabaseAdmin } = require("../config/supabase");

// =====================================================
// GET EDUCATION LEVELS
// =====================================================
router.get("/education-levels", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("education_levels")
            .select("*")
            .order("id");

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load education levels"
        });
    }
});


// =====================================================
// ADD EDUCATION LEVEL
// =====================================================
router.post("/education-levels", requireAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Education level name is required"
            });
        }

        const { data, error } = await supabaseAdmin
            .from("education_levels")
            .insert([
                {
                    name,
                    description
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create education level"
        });
    }
});


// =====================================================
// GET STREAMS
// =====================================================
router.get("/streams/:educationLevelId", async (req, res) => {
    try {
        const { educationLevelId } = req.params;

        const { data, error } = await supabaseAdmin
            .from("streams")
            .select("*")
            .eq("education_level_id", educationLevelId)
            .order("id");

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load streams"
        });
    }
});


// =====================================================
// ADD STREAM
// =====================================================
router.post("/streams", requireAdmin, async (req, res) => {
    try {
        const {
            education_level_id,
            name,
            description
        } = req.body;

        if (!education_level_id || !name) {
            return res.status(400).json({
                success: false,
                message: "Education level and stream name are required"
            });
        }

        const { data, error } = await supabaseAdmin
            .from("streams")
            .insert([
                {
                    education_level_id,
                    name,
                    description
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create stream"
        });
    }
});


// =====================================================
// GET SUBJECTS
// =====================================================
router.get("/subjects/:streamId", async (req, res) => {
    try {
        const { streamId } = req.params;

        const { data, error } = await supabaseAdmin
            .from("subjects")
            .select("*")
            .eq("stream_id", streamId)
            .order("id");

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load subjects"
        });
    }
});


// =====================================================
// ADD SUBJECT
// =====================================================
router.post("/subjects", requireAdmin, async (req, res) => {
    try {
        const {
            stream_id,
            name,
            description
        } = req.body;

        if (!stream_id || !name) {
            return res.status(400).json({
                success: false,
                message: "Stream and subject name are required"
            });
        }

        const { data, error } = await supabaseAdmin
            .from("subjects")
            .insert([
                {
                    stream_id,
                    name,
                    description
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create subject"
        });
    }
});


// =====================================================
// GET TOPICS
// =====================================================
router.get("/topics/:subjectId", async (req, res) => {
    try {
        const { subjectId } = req.params;

        const { data, error } = await supabaseAdmin
            .from("topics")
            .select("*")
            .eq("subject_id", subjectId)
            .order("id");

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load topics"
        });
    }
});


// =====================================================
// ADD TOPIC
// =====================================================
router.post("/topics", requireAdmin, async (req, res) => {
    try {
        const {
            subject_id,
            name,
            description
        } = req.body;

        if (!subject_id || !name) {
            return res.status(400).json({
                success: false,
                message: "Subject and topic name are required"
            });
        }

        const { data, error } = await supabaseAdmin
            .from("topics")
            .insert([
                {
                    subject_id,
                    name,
                    description
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create topic"
        });
    }
});
// =====================================================
// CREATE QUIZ
// =====================================================
router.post("/quizzes", requireAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            difficulty,
            subject_id,
            topic_id,
            time_limit,
            access_type,
            published
        } = req.body;

        if (!title || !category || !difficulty) {
            return res.status(400).json({
                success: false,
                message: "Title, category and difficulty are required"
            });
        }

        const { data, error } = await supabaseAdmin
            .from("quizzes")
            .insert([
                {
                    title,
                    description: description || "",
                    category,
                    difficulty,
                    subject_id: subject_id || null,
                    topic_id: topic_id || null,
                    time_limit: time_limit || 10,
                    access_type: access_type || "free",
                    published: published !== false,
                    total_questions: 0
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: "Quiz created successfully",
            data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create quiz"
        });
    }
});
// =====================================================
// ADD QUESTION TO QUIZ
// =====================================================
router.post("/questions", requireAdmin, async (req, res) => {
    try {
        const {
            quiz_id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            explanation,
            marks,
            negative_marks
        } = req.body;

        if (
            !quiz_id ||
            !question_text ||
            !option_a ||
            !option_b ||
            !option_c ||
            !option_d ||
            !correct_answer
        ) {
            return res.status(400).json({
                success: false,
                message: "All question fields are required"
            });
        }

        const validAnswers = ["A", "B", "C", "D"];

        if (!validAnswers.includes(correct_answer.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Correct answer must be A, B, C or D"
            });
        }

        const { data, error } = await supabaseAdmin
            .from("questions")
            .insert([
                {
                    quiz_id,
                    question_text,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    correct_answer: correct_answer.toUpperCase(),
                    explanation: explanation || "",
                    marks: marks || 1,
                    negative_marks: negative_marks || 0
                }
            ])
            .select()
            .single();

        if (error) throw error;

        // Update total question count
        const { count, error: countError } = await supabaseAdmin
            .from("questions")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("quiz_id", quiz_id);

        if (!countError) {
            await supabaseAdmin
                .from("quizzes")
                .update({
                    total_questions: count || 0
                })
                .eq("id", quiz_id);
        }

        res.status(201).json({
            success: true,
            message: "Question added successfully",
            data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to add question"
        });
    }
});
// =====================================================
// GET QUESTIONS FOR QUIZ
// =====================================================
router.get("/questions/:quizId", requireAdmin, async (req, res) => {
    try {
        const { quizId } = req.params;

        const { data, error } = await supabaseAdmin
            .from("questions")
            .select("*")
            .eq("quiz_id", quizId)
            .order("id");

        if (error) throw error;

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load questions"
        });
    }
});
module.exports = router;