'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronDown } from 'react-icons/fa'
import { faqs } from '@/lib/faqs'
import Section from '@/components/ui/Section'
import Card from '@/components/ui/Card'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <Section id="faq" variant="raised">
            <div className="mx-auto max-w-3xl">
                <SectionHeading
                    className="mb-16"
                    title={
                        <>
                            Frequently asked
                            <span className={`block ${GRADIENT_TEXT}`}>
                                questions
                            </span>
                        </>
                    }
                />

                <div className="space-y-4">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index
                        return (
                            <Card key={faq.question} hover>
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
                            </Card>
                        )
                    })}
                </div>
            </div>
        </Section>
    )
}
