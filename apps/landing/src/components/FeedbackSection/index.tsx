import React from 'react';
import { Mail, MessageCircle, Github, ArrowRight, ExternalLink } from 'lucide-react';

export default function FeedbackSection() {
  const feedbackOptions = [
    {
      icon: <Mail className="w-5 h-5" />,
      title: "Email Us",
      description: "Send feedback directly to our team",
      action: "mailto:hello@devino.ca?subject=UpUp Feedback",
      buttonText: "Send Email"
    },
    {
      icon: <Github className="w-5 h-5" />,
      title: "GitHub Issues",
      description: "Report bugs or request new features",
      actions: [
        {
          url: "https://github.com/DevinoSolutions/upup/issues/new?assignees=&labels=bug&projects=&template=bug_report.md&title=%5BBUG%5D+",
          text: "Report Bug"
        },
        {
          url: "https://github.com/DevinoSolutions/upup/issues/new?assignees=&labels=enhancement&projects=&template=feature_request.md&title=%5BFEATURE%5D+",
          text: "Request Feature"
        }
      ]
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Discord Community",
      description: "Join discussions and get support",
      action: "https://discord.com/invite/ny5WUE9ayc",
      buttonText: "Join Discord"
    }
  ];

  return (
      <section
          id="feedback"
          className="py-24 px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Help us improve
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
              Your feedback drives our development. Share your thoughts, report issues, or suggest new features.
            </p>
          </div>

          {/* Feedback Options */}
          <div className="grid lg:grid-cols-3 gap-8 mb-20">
            {feedbackOptions.map((option, index) => (
                <div
                    key={index}
                    className="group p-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-3xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 shadow-md dark:shadow-none"
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-600 dark:text-gray-400 mb-6">
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
                        target={option.action.startsWith('http') ? '_blank' : undefined}
                        rel={option.action.startsWith('http') ? 'noopener noreferrer' : undefined}
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
                </div>
            ))}
          </div>

          {/* Contributing Section */}
          <div className="shadow-md dark:shadow-none text-center p-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Open Source & Community Driven
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Upup is open source and welcomes contributions. Whether you&apos;re fixing bugs,
              adding features, or improving documentation, every contribution makes a difference.
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
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
              >
                Code of Conduct
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
  );
}