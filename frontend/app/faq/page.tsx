'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function FAQPage() {
  // FAQ data organized by category
  const faqCategories = [
    {
      name: "General",
      questions: [
        {
          question: "What is MedConnect?",
          answer: "MedConnect is a comprehensive telemedicine platform that connects patients with healthcare providers through secure video consultations, messaging, and appointment scheduling. Our platform aims to make healthcare more accessible and convenient for everyone."
        },
        {
          question: "How does telemedicine work?",
          answer: "Telemedicine allows healthcare providers to deliver care to patients remotely through video calls, phone calls, or messaging. Through MedConnect, you can consult with doctors, receive diagnoses and treatment plans, get prescriptions, and follow up on your care—all without having to visit a physical office."
        },
        {
          question: "Is MedConnect available on mobile devices?",
          answer: "Yes, MedConnect is fully accessible on mobile devices. We have native apps available for both iOS and Android, as well as a responsive web application that works on any device with a modern web browser."
        }
      ]
    },
    {
      name: "Appointments",
      questions: [
        {
          question: "How do I schedule an appointment?",
          answer: "You can schedule an appointment by logging into your MedConnect account, browsing available doctors, selecting your preferred doctor, and choosing an available time slot that works for you. You'll receive a confirmation email and reminders before your appointment."
        },
        {
          question: "What if I need to cancel or reschedule?",
          answer: "You can cancel or reschedule your appointment through your MedConnect account up to 2 hours before the scheduled time without any penalty. Simply navigate to 'My Appointments' in your dashboard and select the appointment you want to modify."
        },
        {
          question: "How long are typical appointments?",
          answer: "Most consultation appointments are scheduled for 15-30 minutes, depending on the type of visit and the healthcare provider. Follow-up appointments are typically shorter, around 10-15 minutes."
        }
      ]
    },
    {
      name: "Technical",
      questions: [
        {
          question: "What technical requirements do I need for video consultations?",
          answer: "For the best experience, you need a device with a camera and microphone (smartphone, tablet, or computer), a stable internet connection (minimum 1 Mbps upload/download speed), and an updated browser (Chrome, Firefox, Safari, or Edge) or our mobile app."
        },
        {
          question: "What if I experience technical difficulties during a consultation?",
          answer: "If you experience technical issues during your consultation, the platform will automatically attempt to reconnect. If problems persist, you can switch to audio-only mode or messaging. Our technical support team is also available 24/7 via the chat icon in the bottom right corner of your screen."
        },
        {
          question: "Is my personal health information secure?",
          answer: "Yes, MedConnect is fully HIPAA compliant and uses end-to-end encryption for all video consultations and messages. Your personal health information is stored securely and is never shared with third parties without your explicit consent."
        }
      ]
    },
    {
      name: "Billing & Insurance",
      questions: [
        {
          question: "Does MedConnect accept insurance?",
          answer: "Yes, MedConnect works with many major insurance providers. You can verify your coverage during the registration process or in your account settings. We'll show you your estimated copay before you book an appointment."
        },
        {
          question: "How much does a visit cost without insurance?",
          answer: "Without insurance, consultation costs vary depending on the type of visit and specialist. General practitioner visits typically range from $50-$75, while specialist consultations may range from $100-$200. You can see exact pricing when you book an appointment."
        },
        {
          question: "When will I be charged for my appointment?",
          answer: "Your payment method will be authorized when you book an appointment but you'll only be charged after the consultation is completed. If you cancel within the allowed timeframe, no charges will be applied to your account."
        }
      ]
    }
  ];

  // State to track which FAQ is open
  const [activeCategory, setActiveCategory] = useState("General");
  const [openQuestions, setOpenQuestions] = useState<{[key: string]: boolean}>({});

  // Toggle question open/closed
  const toggleQuestion = (questionText: string) => {
    setOpenQuestions(prev => ({
      ...prev,
      [questionText]: !prev[questionText]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Navigation */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary-600">MedConnect</h1>
            </Link>
            <nav className="hidden md:flex space-x-10">
              <Link href="/about" className="text-gray-600 hover:text-primary-600 transition-colors">
                About
              </Link>
              <Link href="/features" className="text-gray-600 hover:text-primary-600 transition-colors">
                Features
              </Link>
              <Link href="/faq" className="text-primary-600 font-medium">
                FAQ
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-primary-600 transition-colors">
                Contact
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-gray-600 hover:text-primary-600 transition-colors">
                Sign in
              </Link>
              <Link href="/auth/register" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked <span className="text-primary-600">Questions</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Find answers to common questions about our telemedicine platform, appointments, technical requirements, and billing.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-8 px-4 mb-20">
        <div className="max-w-4xl mx-auto">
          {/* Category Tabs */}
          <motion.div 
            className="flex flex-wrap mb-8 border-b border-gray-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {faqCategories.map((category) => (
              <button
                key={category.name}
                className={`px-6 py-3 text-lg font-medium transition-colors relative ${
                  activeCategory === category.name
                    ? 'text-primary-600'
                    : 'text-gray-600 hover:text-primary-600'
                }`}
                onClick={() => setActiveCategory(category.name)}
              >
                {category.name}
                {activeCategory === category.name && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                    layoutId="activeTab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
            ))}
          </motion.div>

          {/* FAQ Accordions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4"
          >
            {faqCategories
              .find(cat => cat.name === activeCategory)?.questions
              .map((faq, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <button
                    className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                    onClick={() => toggleQuestion(faq.question)}
                  >
                    <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${
                        openQuestions[faq.question] ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <AnimatePresence>
                    {openQuestions[faq.question] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4 text-gray-600">
                          <div className="border-t border-gray-100 pt-4">
                            {faq.answer}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
          </motion.div>
        </div>
      </section>

      {/* Still Have Questions Section */}
      <section className="py-16 px-4 bg-primary-50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Still Have Questions?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Our support team is here to help. Contact us anytime and we'll get back to you as soon as possible.
            </p>
            <Link href="/contact" className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors">
              Contact Support
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-4">MedConnect</h1>
              <p className="mb-4">Transforming healthcare through innovative telemedicine solutions.</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/compliance" className="hover:text-white transition-colors">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <p>© {new Date().getFullYear()} MedConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 