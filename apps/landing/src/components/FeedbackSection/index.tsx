import React from 'react'
import {
    Mail,
    MessageCircle,
    Github,
    ArrowRight,
    ExternalLink,
    LifeBuoy,
} from 'lucide-react'
import Section from '@/components/ui/Section'
import Card from '@/components/ui/Card'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'
import { ICON_CHIP } from '@/components/ui/recipes'

export default function FeedbackSection() {
    const feedbackOptions: {
        icon: React.ReactNode
        title: string
        description: string
        action?: string
        buttonText?: string
        actions?: { url: string; text: string }[]
    }[] = [
        {
            icon: <LifeBuoy className="w-5 h-5" />,
            title: 'Contact Support',
            description:
                'Open a support request — problems, feature ideas, or questions',
            action: '/support',
            buttonText: 'Open Support',
        },
        {
            icon: <Mail className="w-5 h-5" />,
            title: 'Email Us',
            description: 'Send feedback directly to our team',
            action: 'mailto:hello@devino.ca?subject=UpUp Feedback',
            buttonText: 'Send Email',
        },
        {
            icon: <Github className="w-5 h-5" />,
            title: 'GitHub Issues',
            description: 'Report bugs or request new features',
            actions: [
                {
                    url: 'https://github.com/DevinoSolutions/upup/issues/new?assignees=&labels=bug&projects=&template=bug_report.md&title=%5BBUG%5D+',
                    text: 'Report Bug',
                },
                {
                    url: 'https://github.com/DevinoSolutions/upup/issues/new?assignees=&labels=enhancement&projects=&template=feature_request.md&title=%5BFEATURE%5D+',
                    text: 'Request Feature',
                },
            ],
        },
        {
            icon: <MessageCircle className="w-5 h-5" />,
            title: 'Discord Community',
            description: 'Join discussions and get support',
            action: 'https://discord.com/invite/ny5WUE9ayc',
            buttonText: 'Join Discord',
        },
    ]

    return (
        <Section id="feedback" bordered>
            <SectionHeading
                badge={
                    <>
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        We&apos;re listening
                    </>
                }
                title={
                    <>
                        Help us <span className={GRADIENT_TEXT}>improve</span>
                    </>
                }
                subtitle="Your feedback drives our development. Share your thoughts, report issues, or suggest new features."
            />

            {/* Feedback Options */}
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
                {feedbackOptions.map((option, index) => (
                    <Card key={index} className="p-8">
                        <div
                            className={`${ICON_CHIP} w-12 h-12 rounded-2xl mb-6`}
                        >
                            {option.icon}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            {option.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                            {option.description}
                        </p>

                        {/* Single action button */}
                        {option.action && (
                            <a
                                href={option.action}
                                target={
                                    option.action.startsWith('http')
                                        ? '_blank'
                                        : undefined
                                }
                                rel={
                                    option.action.startsWith('http')
                                        ? 'noopener noreferrer'
                                        : undefined
                                }
                                className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                            >
                                {option.buttonText}
                            </a>
                        )}

                        {/* Multiple action buttons */}
                        {option.actions && (
                            <div className="flex flex-col xl:flex-row gap-2">
                                {option.actions.map((action, actionIndex) => (
                                    <a
                                        key={actionIndex}
                                        href={action.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex text-sm items-center justify-center flex-1 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                                    >
                                        {action.text}
                                    </a>
                                ))}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {/* Contributing Section */}
            <Card className="p-12 text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Open Source &amp; Community Driven
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                    Upup is open source and welcomes contributions. Whether
                    you&apos;re fixing bugs, adding features, or improving
                    documentation, every contribution makes a difference.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="https://github.com/DevinoSolutions/upup/blob/master/CONTRIBUTING.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                    >
                        <Github className="w-5 h-5" />
                        Contributing Guide
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <a
                        href="https://github.com/DevinoSolutions/upup/blob/master/CODE_OF_CONDUCT.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-black/[0.03] px-8 py-4 font-semibold text-gray-700 transition-colors hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                    >
                        Code of Conduct
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </Card>
        </Section>
    )
}
