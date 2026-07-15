'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronDown } from 'react-icons/fa'
import { faqs } from '@/lib/faqs'

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <section id="faq" className="py-16 px-6">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Frequently asked
                        <span className="block bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                            questions
                        </span>
                    </h2>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index
                        return (
                            <div
                                key={faq.question}
                                className="shadow-md bg-white dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden"
                            >
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-panel-${index}`}
                                    onClick={() =>
                                        setOpenIndex(isOpen ? null : index)
                                    }
                                >
                                    <span
                                        id={`faq-q-${index}`}
                                        className="font-semibold text-gray-900 dark:text-white"
                                    >
                                        {faq.question}
                                    </span>
                                    <FaChevronDown
                                        className={`w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                                            isOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                <div
                                    id={`faq-panel-${index}`}
                                    role="region"
                                    aria-labelledby={`faq-q-${index}`}
                                >
                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div
                                                initial={{
                                                    height: 0,
                                                    opacity: 0,
                                                }}
                                                animate={{
                                                    height: 'auto',
                                                    opacity: 1,
                                                }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <p className="px-6 pb-5 text-gray-600 dark:text-gray-300 leading-relaxed">
                                                    {faq.answer}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
