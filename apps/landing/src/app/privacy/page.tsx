// src/pages/privacy.tsx
import React from "react";

const Privacy: React.FC = () => {
    return (
        <main className="
        min-h-screen
        flex items-center justify-center
        bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-50
        p-12 md:py-6 md:px-2
      ">
            <div className="
          bg-bg dark:bg-bg-dark
          text-gray-900 dark:text-gray-100
          rounded-xl shadow-2xl
          p-10 md:p-6
          max-w-5xl md:max-w-full md:mx-1 w-full mx-4
        ">
                <article className="prose prose-lg md:prose-base dark:prose-invert">
                    <h1 className="text-primary dark:text-primary-dark">Privacy Policy</h1>
                    <p><em>Last Updated: April 25th, 2025</em></p>

                    <p>
                        Welcome to <strong>Upup</strong> (https://useupup.com). This Privacy
                        Policy explains how we collect, use, and safeguard your information
                        when you visit our website or use our services.
                    </p>

                    <h2>1. Information We Collect</h2>
                    <p>
                        We may collect personal data such as your name and email address
                        when you sign up or contact us. Additionally, we gather usage data
                        via cookies and similar technologies.
                    </p>

                    <h2>2. How We Use Your Information</h2>
                    <p>
                        Your information is used to improve our services, personalize your
                        experience, and communicate updates. We ensure that we only use
                        data in ways that enhance your user experience.
                    </p>

                    <h2>3. Sharing Your Information</h2>
                    <p>
                        We do not sell or rent your data to third parties. In some cases, we
                        may share information with trusted partners who assist us in
                        operating our site, under strict confidentiality agreements.
                    </p>

                    <h2>4. Security</h2>
                    <p>
                        We implement appropriate measures to protect your personal
                        information; however, no online transmission is completely secure.
                    </p>

                    <h2>5. Your Rights</h2>
                    <p>
                        Depending on your jurisdiction, you may have the right to access,
                        correct, or request the deletion of your personal information. For
                        any such requests, please contact us at{" "}
                        <a
                            href="mailto:hello@devino.ca"
                            className="text-primary dark:text-primary-dark hover:underline"
                        >
                            hello@devino.ca
                        </a>
                        .
                    </p>

                    <h2>6. Changes to This Policy</h2>
                    <p>
                        This Privacy Policy may be updated from time to time. We encourage
                        you to review it periodically.
                    </p>

                    <h2>7. Contact Us</h2>
                    <p>
                        If you have any questions regarding this Privacy Policy, please
                        reach out via{" "}
                        <a
                            href="mailto:hello@devino.ca"
                            className="text-primary dark:text-primary-dark hover:underline"
                        >
                            hello@devino.ca
                        </a>
                        .
                    </p>
                </article>
            </div>
        </main>
    );
};

export default Privacy;
