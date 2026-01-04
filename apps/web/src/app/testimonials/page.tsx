'use client';
import React, { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';
import Link from 'next/link';
import { getFrontendApiBaseUrl } from '@/config/env';

type Testimonial = {
    id: string;
    author: string;
    content: string;
    rating: number;
    source?: string;
    avatarUrl?: string;
};

export default function TestimonialsPage() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Fetch testimonials - reusing logic from TestimonialCarousel.tsx
    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const baseUrl = getFrontendApiBaseUrl();
                const response = await fetch(`${baseUrl}/testimonials/active`);
                if (response.ok) {
                    const data = await response.json();
                    // For looping, we can duplicate the data if needed, 
                    // but for basic scroll-snap, we just need the data.
                    setTestimonials(data);
                }
            } catch (error) {
                console.error('Failed to fetch testimonials', error);
            }
        };
        fetchTestimonials();
    }, []);

    // Split testimonials into chunks of 2 for "1 column, 2 rows"
    const slides = [];
    for (let i = 0; i < testimonials.length; i += 2) {
        slides.push(testimonials.slice(i, i + 2));
    }

    // Handle scroll to update active dot
    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const index = Math.round(scrollLeft / clientWidth);
            setActiveIndex(index % slides.length);
        }
    };

    if (testimonials.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <header className="px-6 py-8 text-center">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                    CUSTOMER LOVE
                </h1>
                <p className="text-gray-500 text-sm">Real stories from our amazing community</p>
            </header>

            <main className="flex-1 px-4 overflow-hidden mb-12">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 pb-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Looping: To simulate infinite loop with scroll-snap, we can repeat slides */}
                    {[...slides, ...slides, ...slides].map((slide, slideIdx) => (
                        <div
                            key={`${slideIdx}`}
                            className="min-w-full snap-center flex flex-col gap-4 px-2"
                        >
                            {slide.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[180px]"
                                >
                                    <div className="flex gap-1 mb-3">
                                        {[...Array(5)].map((_, i) => (
                                            <svg
                                                key={i}
                                                className={`h-4 w-4 ${i < item.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-gray-800 text-base leading-relaxed mb-4 flex-grow line-clamp-4">
                                        "{item.content}"
                                    </p>
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-50 mt-auto">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {item.author.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-gray-900">{item.author}</div>
                                            <div className="text-[11px] text-gray-400 uppercase tracking-widest">
                                                {item.source || 'Verified Customer'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Indicators */}
                <div className="flex justify-center gap-2 mt-4">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'
                                }`}
                        />
                    ))}
                </div>
            </main>

            <footer className="p-6 mt-auto">
                <Link
                    href="/"
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                    Back to Shop
                </Link>
            </footer>
        </div>
    );
}
