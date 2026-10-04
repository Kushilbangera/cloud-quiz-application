const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const {
    supabaseAdmin
} = require("../config/supabase");

const router = express.Router();


/* =========================================================
   RAZORPAY CONFIGURATION
========================================================= */

const razorpayKeyId =
    process.env.RAZORPAY_KEY_ID;

const razorpayKeySecret =
    process.env.RAZORPAY_KEY_SECRET;


/*
    QuizCloud is configured for Razorpay TEST MODE.

    Your .env must contain:

    RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
    RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
*/


if (!razorpayKeyId ||
    !razorpayKeySecret) {

    console.warn(
        "⚠️ Razorpay credentials are missing from .env"
    );
}


if (
    razorpayKeyId &&
    !razorpayKeyId.startsWith("rzp_test_")
) {

    console.warn(
        "⚠️ WARNING: QuizCloud is configured for TEST MODE, but RAZORPAY_KEY_ID does not start with rzp_test_"
    );
}


const razorpay =
    razorpayKeyId && razorpayKeySecret
        ? new Razorpay({
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret
        })
        : null;


/* =========================================================
   HELPER: GET USER
========================================================= */

async function getAuthenticatedUser(req) {

    const authorization =
        req.headers.authorization;


    if (!authorization ||
        !authorization.startsWith("Bearer ")) {

        return null;
    }


    const token =
        authorization.substring(
            7
        );


    if (!token) {
        return null;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseAdmin.auth.getUser(
                token
            );


        if (error ||
            !data?.user) {

            console.error(
                "Supabase auth error:",
                error
            );

            return null;
        }


        return data.user;

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        return null;
    }
}


/* =========================================================
   CREATE RAZORPAY ORDER
========================================================= */

router.post(
    "/create-order",
    async (req, res) => {

        try {

            /*
                Check Razorpay credentials
            */

            if (
                !razorpayKeyId ||
                !razorpayKeySecret
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Razorpay credentials are missing. Check backend/.env."
                });
            }

            if (!razorpay) {
                throw new Error("Razorpay client is not configured.");
            }


            /*
                Make sure TEST MODE is being used.
            */

            if (
                !razorpayKeyId.startsWith(
                    "rzp_test_"
                )
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "QuizCloud is configured for Razorpay TEST MODE. Use an rzp_test_ Key ID."
                });
            }


            /*
                Authenticate user
            */

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required. Please login again."
                });
            }


            /*
                Premium price = ₹499
                Razorpay uses paise.

                ₹499 = 49900 paise
            */

            const amount =
                49900;


            const currency =
                "INR";


            /*
                Generate unique receipt.
            */

            const receipt =
                `quizcloud_${Date.now()}_${Math.floor(
                    Math.random() * 100000
                )}`;


            /*
                Create Razorpay order.
            */

            const order =
                await razorpay.orders.create({

                    amount:
                        amount,

                    currency:
                        currency,

                    receipt:
                        receipt,

                    notes: {

                        user_id:
                            user.id,

                        email:
                            user.email || "",

                        plan:
                            "premium"
                    }
                });


            console.log(
                "✅ Razorpay TEST order created:",
                order.id
            );


            /*
                Save order in Supabase.
            */

            const {
                error:
                    paymentInsertError
            } =
                await supabaseAdmin
                    .from("payments")
                    .insert({

                        order_id:
                            order.id,

                        email:
                            user.email || "",

                        name:
                            user.user_metadata
                                ?.full_name ||
                            user.user_metadata
                                ?.name ||
                            "",

                        amount:
                            amount,

                        currency:
                            currency,

                        status:
                            "created"
                    });


            if (paymentInsertError) {

                console.error(
                    "Payment DB insert error:",
                    paymentInsertError
                );

                /*
                    We don't expose database
                    internals to the browser.
                */

                return res.status(500).json({

                    success: false,

                    message:
                        "Payment order was created, but could not be saved."
                });
            }


            /*
                Return only what frontend needs.
            */

            return res.status(201).json({

                success: true,

                data: {

                    id:
                        order.id,

                    amount:
                        order.amount,

                    currency:
                        order.currency,

                    key_id:
                        razorpayKeyId
                }
            });


        } catch (error) {

            console.error(
                "❌ Razorpay create-order error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error?.error?.description ||
                    error?.message ||
                    "Unable to create Razorpay order."
            });
        }
    }
);


/* =========================================================
   VERIFY RAZORPAY PAYMENT
========================================================= */

router.post(
    "/verify",
    async (req, res) => {

        try {

            if (
                !razorpayKeyId ||
                !razorpayKeySecret
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Razorpay credentials are missing. Check backend/.env."
                });
            }


            /*
                Authenticate user
            */

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required. Please login again."
                });
            }


            const {

                razorpay_order_id,

                razorpay_payment_id,

                razorpay_signature

            } = req.body;


            /*
                Validate required fields.
            */

            if (
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Missing Razorpay payment details."
                });
            }


            /*
                Find the order in our database.
            */

            const {
                data:
                    paymentRecord,

                error:
                    paymentLookupError
            } =
                await supabaseAdmin
                    .from("payments")
                    .select("*")
                    .eq(
                        "order_id",
                        razorpay_order_id
                    )
                    .maybeSingle();


            if (paymentLookupError) {

                console.error(
                    "Payment lookup error:",
                    paymentLookupError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to verify payment."
                });
            }


            if (!paymentRecord) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Payment order was not found."
                });
            }


            /*
                Make sure the order belongs to
                the logged-in user's email.
            */

            if (
                paymentRecord.email &&
                user.email &&
                paymentRecord.email.toLowerCase() !==
                    user.email.toLowerCase()
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "This payment order does not belong to the logged-in user."
                });
            }


            /*
                Generate expected Razorpay signature.

                HMAC SHA256:
                order_id + "|" + payment_id
            */

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        razorpayKeySecret
                    )
                    .update(
                        `${razorpay_order_id}|${razorpay_payment_id}`
                    )
                    .digest("hex");


            /*
                Timing-safe signature comparison.
            */

            const expectedBuffer =
                Buffer.from(
                    generatedSignature,
                    "utf8"
                );


            const receivedBuffer =
                Buffer.from(
                    razorpay_signature,
                    "utf8"
                );


            if (
                expectedBuffer.length !==
                receivedBuffer.length
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid Razorpay payment signature."
                });
            }


            const signatureValid =
                crypto.timingSafeEqual(
                    expectedBuffer,
                    receivedBuffer
                );


            if (!signatureValid) {

                console.error(
                    "❌ Invalid Razorpay signature"
                );


                return res.status(400).json({

                    success: false,

                    message:
                        "Payment signature verification failed."
                });
            }


            /*
                Signature is valid.

                Now fetch the payment from Razorpay
                and confirm it is captured.
            */

            const payment =
                await razorpay.payments.fetch(
                    razorpay_payment_id
                );


            if (
                payment.order_id !==
                razorpay_order_id
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment does not belong to this order."
                });
            }


            /*
                Razorpay payment should be captured.
            */

            if (
                payment.status !==
                "captured"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Payment is not captured yet. Current status: ${payment.status}`
                });
            }


            /*
                Verify amount as well.
            */

            if (
                Number(payment.amount) !==
                Number(paymentRecord.amount)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment amount verification failed."
                });
            }


            /*
                Update payment record.
            */

            const {
                error:
                    updatePaymentError
            } =
                await supabaseAdmin
                    .from("payments")
                    .update({

                        payment_id:
                            razorpay_payment_id,

                        status:
                            "paid",

                        paid_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "order_id",
                        razorpay_order_id
                    );


            if (updatePaymentError) {

                console.error(
                    "Payment update error:",
                    updatePaymentError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Payment was verified but could not update the payment record."
                });
            }


            /*
                Update profiles.plan.

                Your project already has:
                profiles.plan
            */

            const {
                error:
                    profileUpdateError
            } =
                await supabaseAdmin
                    .from("profiles")
                    .update({

                        plan:
                            "premium"

                    })
                    .eq(
                        "id",
                        user.id
                    );


            if (profileUpdateError) {

                console.error(
                    "Profile premium update error:",
                    profileUpdateError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Payment succeeded, but Premium activation failed. Please contact support."
                });
            }


            console.log(
                "🎉 QuizCloud Premium activated:",
                user.email
            );


            return res.json({

                success: true,

                message:
                    "Payment verified and Premium activated.",

                data: {

                    payment_id:
                        razorpay_payment_id,

                    order_id:
                        razorpay_order_id,

                    plan:
                        "premium"
                }
            });


        } catch (error) {

            console.error(
                "❌ Razorpay verification error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error?.error?.description ||
                    error?.message ||
                    "Unable to verify Razorpay payment."
            });
        }
    }
);


/* =========================================================
   PAYMENT STATUS
========================================================= */

router.get(
    "/status/:orderId",
    async (req, res) => {

        try {

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."
                });
            }


            const orderId =
                req.params.orderId;


            if (!orderId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Order ID is required."
                });
            }


            const {
                data:
                    payment,

                error
            } =
                await supabaseAdmin
                    .from("payments")
                    .select(
                        "id, order_id, payment_id, email, name, amount, currency, status, paid_at, created_at"
                    )
                    .eq(
                        "order_id",
                        orderId
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "Payment status error:",
                    error
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to get payment status."
                });
            }


            if (!payment) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Payment not found."
                });
            }


            /*
                Do not allow another user to
                inspect someone else's payment.
            */

            if (
                payment.email &&
                user.email &&
                payment.email.toLowerCase() !==
                    user.email.toLowerCase()
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not allowed to view this payment."
                });
            }


            return res.json({

                success: true,

                data:
                    payment
            });


        } catch (error) {

            console.error(
                "Payment status error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to get payment status."
            });
        }
    }
);


/* =========================================================
   EXPORT
========================================================= */

module.exports =
    router;