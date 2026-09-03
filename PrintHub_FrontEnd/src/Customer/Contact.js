import React, { useState } from "react";
import {
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaClock,
    FaPaperPlane,
    FaFacebook,
} from "react-icons/fa";

import "./Contact.css";
import pmgLogo from "../assets/brand/pmg-logo-black.png";

function Contact() {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        message: "",
    });

    const [submitted, setSubmitted] = useState(false);
    const [phoneError, setPhoneError] = useState("");

    // =========================================================
    // HANDLE INPUT CHANGES
    // =========================================================

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        setSubmitted(false);

        // ONLY validate the phone field
        if (name === "phone") {
            const cleanedPhone = value.replace(/[\s-]/g, "");

            if (cleanedPhone === "") {
                setPhoneError("");
                return;
            }

            // Philippine mobile formats:
            // 09XXXXXXXXX
            // +639XXXXXXXXX
            const isValidPHMobile =
                /^09\d{9}$/.test(cleanedPhone) ||
                /^\+639\d{9}$/.test(cleanedPhone);

            if (!isValidPHMobile) {
                setPhoneError(
                    "Use a valid PH mobile number, like 09XXXXXXXXX or +639XXXXXXXXX."
                );
            } else {
                setPhoneError("");
            }
        }
    };

    // =========================================================
    // SUBMIT FORM
    // =========================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSubmitted(false);

        // -------------------------------------------------------
        // NAME VALIDATION
        // -------------------------------------------------------

        if (!formData.name.trim()) {
            alert("Please enter your name.");
            return;
        }

        // -------------------------------------------------------
        // PHONE VALIDATION
        // -------------------------------------------------------

        const cleanedPhone = formData.phone.replace(/[\s-]/g, "");

        const isValidPHMobile =
            /^09\d{9}$/.test(cleanedPhone) ||
            /^\+639\d{9}$/.test(cleanedPhone);

        if (!isValidPHMobile) {
            setPhoneError(
                "Use a valid PH mobile number, like 09XXXXXXXXX or +639XXXXXXXXX."
            );
            return;
        }

        // -------------------------------------------------------
        // MESSAGE VALIDATION
        // -------------------------------------------------------

        if (!formData.message.trim()) {
            alert("Please enter your message.");
            return;
        }

        setPhoneError("");

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || "http://localhost:3000"}/api/contact`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: formData.name.trim(),
                        phone: cleanedPhone,
                        message: formData.message.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to send message."
                );
            }

            setSubmitted(true);

            setFormData({
                name: "",
                phone: "",
                message: "",
            });

            setPhoneError("");
        } catch (error) {
            console.error("Contact form error:", error);

            alert(
                error.message ||
                "Unable to send your message. Please try again."
            );
        }
    };

    // =========================================================
    // OPEN GMAIL COMPOSE
    // =========================================================

    const openGmail = (email) => {
        const gmailUrl =
            `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                email
            )}`;

        window.open(
            gmailUrl,
            "_blank",
            "noopener,noreferrer"
        );
    };

    // =========================================================
    // OPEN FACEBOOK MESSENGER
    // =========================================================

    const openMessenger = () => {
        window.open(
            "https://www.facebook.com/pmgprintinghouse",
            "_blank",
            "noopener,noreferrer"
        );
    };

    return (
        <main className="pmg-contact-page">

            {/* =====================================================
                HERO
                ===================================================== */}

            <section className="contact-hero">

                <div className="contact-hero-eyebrow">
                    GET IN TOUCH WITH PMG
                </div>

                <h1>
                    HAVE SOME{" "}
                    <span>QUESTIONS?</span>
                </h1>

                <p>
                    If you have any question, please feel free to get in touch with us!
                </p>

            </section>


            {/* =====================================================
                CONTACT CONTENT
                ===================================================== */}

            <section className="contact-content-section">

                <div className="contact-content-container">

                    {/* =================================================
                        CONTACT FORM
                        ================================================= */}

                    <div className="contact-card contact-form-card">

                        <div className="contact-card-heading">

                            <h2>
                                GET IN TOUCH
                            </h2>

                            <span></span>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                            noValidate
                            autoComplete="off"
                        >

                            {/* =================================================
                                NAME
                                ================================================= */}

                            <div className="contact-form-group">

                                <label htmlFor="contact-name">
                                    NAME
                                </label>

                                <input
                                    id="contact-name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your name"
                                    autoComplete="off"
                                />

                            </div>


                            {/* =================================================
                                PHONE NUMBER
                                ================================================= */}

                            <div className="contact-form-group">

                                <label htmlFor="contact-phone">
                                    PHONE NUMBER
                                </label>

                                <input
                                    id="contact-phone"
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter your phone number"
                                    autoComplete="off"
                                    className={
                                        phoneError
                                            ? "contact-input-error"
                                            : ""
                                    }
                                />

                                {phoneError && (
                                    <p className="contact-phone-error">
                                        {phoneError}
                                    </p>
                                )}

                            </div>


                            {/* =================================================
                                MESSAGE
                                ================================================= */}

                            <div className="contact-form-group">

                                <label htmlFor="contact-message">
                                    YOUR MESSAGE
                                </label>

                                <textarea
                                    id="contact-message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    placeholder="Type your message here..."
                                    autoComplete="off"
                                />

                            </div>


                            {/* =================================================
                                SEND BUTTON
                                ================================================= */}

                            <button
                                type="submit"
                                className="contact-send-button"
                            >

                                <span>
                                    SEND MESSAGE
                                </span>

                                <FaPaperPlane />

                            </button>


                            {/* =================================================
                                SUCCESS MESSAGE
                                ================================================= */}

                            {submitted && (
                                <div className="contact-success-message">
                                    Your message has been sent successfully.
                                </div>
                            )}

                        </form>

                    </div>


                    {/* =================================================
                        RIGHT COLUMN
                        ================================================= */}

                    <div className="contact-right-column">


                        {/* =================================================
                            CONTACT INFORMATION
                            ================================================= */}

                        <div className="contact-card contact-information-card">

                            <div className="contact-card-heading">

                                <h2>
                                    CONTACT INFORMATION
                                </h2>

                                <span></span>

                            </div>


                            <div className="contact-information-grid">


                                {/* =================================================
                                    MAIN BRANCH
                                    ================================================= */}

                                <div className="contact-information-item contact-branch-item">

                                    <div className="contact-icon">
                                        <FaMapMarkerAlt />
                                    </div>

                                    <div>

                                        <h3>
                                            GENERAL TRIAS, CAVITE
                                        </h3>

                                        <button
                                            type="button"
                                            className="contact-email-link"
                                            onClick={() =>
                                                openGmail(
                                                    "htcelearn@gmail.com"
                                                )
                                            }
                                        >

                                            <FaEnvelope />

                                            <span>
                                                htcelearn@gmail.com
                                            </span>

                                        </button>

                                    </div>

                                </div>


                                {/* =================================================
                                    BACOOR BRANCH
                                    ================================================= */}

                                <div className="contact-information-item contact-branch-item">

                                    <div className="contact-icon">
                                        <FaMapMarkerAlt />
                                    </div>

                                    <div>

                                        <h3>
                                            BACOOR, CAVITE
                                        </h3>

                                        <button
                                            type="button"
                                            className="contact-email-link"
                                            onClick={() =>
                                                openGmail(
                                                    "dtfpmgbacoor@gmail.com"
                                                )
                                            }
                                        >

                                            <FaEnvelope />

                                            <span>
                                                dtfpmgbacoor@gmail.com
                                            </span>

                                        </button>

                                    </div>

                                </div>


                                {/* =================================================
                                    GMA BRANCH
                                    ================================================= */}

                                <div className="contact-information-item contact-branch-item">

                                    <div className="contact-icon">
                                        <FaMapMarkerAlt />
                                    </div>

                                    <div>

                                        <h3>
                                            GMA, CAVITE
                                        </h3>

                                        <button
                                            type="button"
                                            className="contact-email-link"
                                            onClick={() =>
                                                openGmail(
                                                    "121619multiventuresinc@gmail.com"
                                                )
                                            }
                                        >

                                            <FaEnvelope />

                                            <span>
                                                121619multiventuresinc@gmail.com
                                            </span>

                                        </button>

                                    </div>

                                </div>


                                {/* =================================================
                                    TRECE MARTIRES BRANCH
                                    ================================================= */}

                                <div className="contact-information-item contact-branch-item">

                                    <div className="contact-icon">
                                        <FaMapMarkerAlt />
                                    </div>

                                    <div>

                                        <h3>
                                            TRECE MARTIRES, CAVITE
                                        </h3>

                                        <button
                                            type="button"
                                            className="contact-email-link"
                                            onClick={() =>
                                                openGmail(
                                                    "onetwoonesixoneninetrece@gmail.com"
                                                )
                                            }
                                        >

                                            <FaEnvelope />

                                            <span>
                                                onetwoonesixoneninetrece@gmail.com
                                            </span>

                                        </button>

                                    </div>

                                </div>


                                {/* =================================================
                                    PHONE NUMBERS
                                    ================================================= */}

                                <div className="contact-information-item contact-phone-item">

                                    <div className="contact-icon">
                                        <FaPhone />
                                    </div>

                                    <div>

                                        <h3>
                                            PHONE NUMBERS
                                        </h3>

                                        <p>
                                            0938-934-3337
                                            <br />
                                            0908-185-8988
                                            <br />
                                            0912-204-3818
                                        </p>

                                    </div>

                                </div>


                                {/* =================================================
                                    SOCIAL MEDIA
                                    ================================================= */}

                                <div className="contact-messenger-item">

                                    <h3>
                                        SOCIAL MEDIA ACC
                                    </h3>

                                    <a
                                        href="https://www.facebook.com/pmgprintinghouse"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="contact-messenger-link"
                                    >

                                        <FaFacebook />

                                        <span>
                                            PMG PRINTING HOUSE
                                        </span>

                                    </a>

                                </div>


                            </div>

                        </div>


                        {/* =================================================
                            BUSINESS HOURS
                            ================================================= */}

                        <div className="contact-card contact-hours-card">

                            <div className="contact-card-heading">

                                <h2>
                                    BUSINESS HOURS
                                </h2>

                                <span></span>

                            </div>


                            <div className="contact-hours-grid">


                                {/* MONDAY - FRIDAY */}

                                <div className="contact-hours-item">

                                    <div className="contact-hours-icon">
                                        <FaClock />
                                    </div>

                                    <h3>
                                        MONDAY - FRIDAY
                                    </h3>

                                    <p>
                                        8:00 am - 11:00 pm
                                    </p>

                                </div>


                                {/* SATURDAY */}

                                <div className="contact-hours-item">

                                    <div className="contact-hours-icon">
                                        <FaClock />
                                    </div>

                                    <h3>
                                        SATURDAY
                                    </h3>

                                    <p>
                                        8:00 am - 11:00 pm
                                    </p>

                                </div>


                                {/* HOLIDAYS */}

                                <div className="contact-hours-item">

                                    <div className="contact-hours-icon">
                                        <FaClock />
                                    </div>

                                    <h3>
                                        HOLIDAYS
                                    </h3>

                                    <p>
                                        8:00 am - 11:00 pm
                                    </p>

                                </div>


                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                FOOTER
                ===================================================== */}

            <footer className="contact-footer">

                <img
                    src={pmgLogo}
                    alt="PMG Printing House"
                    className="contact-footer-logo"
                />

                <p>
                    © 2024 PMG Printing House. All rights reserved.
                </p>

            </footer>

        </main>
    );
}

export default Contact;