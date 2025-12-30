'use client';

import React, { useEffect, useState, useRef } from 'react';

type Testimonial = {
    id: string;
    author: string;
    content: string;
    rating: number;
    source?: string;
    avatarUrl?: string;
};

const TestimonialCarousel = () => {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch testimonials
    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/testimonials/active`);
                if (response.ok) {
                    const data = await response.json();
                    // Duplicate items if length is small to ensure smooth infinite loop for visible items
                    // But for a simple carousel, just having enough items is fine.
                    setTestimonials(data);
                }
            } catch (error) {
                console.error('Failed to fetch testimonials', error);
            }
        };
        fetchTestimonials();
    }, []);

    const nextSlide = () => {
        if (isAnimating || testimonials.length === 0) return;
        setIsAnimating(true);
        setDirection('right');

        // Animate to next slide
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
            setIsAnimating(false);
            setDirection(null);
        }, 500); // Animation duration
    };

    const prevSlide = () => {
        if (isAnimating || testimonials.length === 0) return;
        setIsAnimating(true);
        setDirection('left');

        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
            setIsAnimating(false);
            setDirection(null);
        }, 500);
    };

    // Auto-play
    useEffect(() => {
        if (testimonials.length === 0) return;

        timeoutRef.current = setTimeout(() => {
            nextSlide();
        }, 5000); // 5 seconds per slide

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentIndex, testimonials.length]);

    if (testimonials.length === 0) return null;

    // We want to show 3 items at a time on desktop, 1 on mobile
    // For simplicity, let's just render the current one prominently or use a transform
    // But user asked for "carousel" (走马灯).
    // A simple implementation is a container that shifts.

    return (
        <div className="w-full bg-gray-50 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
                    Loved by teams big and small
                </h2>

                <div className="relative">
                    {/* Arrow Left */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 focus:outline-none transition-colors"
                        aria-label="Previous testimonial"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Carousel Viewport */}
                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {testimonials.map((testimonial) => (
                                <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center h-full">
                                        {/* Rating */}
                                        <div className="flex space-x-1 mb-4">
                                            {[...Array(5)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>

                                        {/* Content */}
                                        <blockquote className="text-lg text-gray-700 italic mb-6 line-clamp-4">
                                            "{testimonial.content}"
                                        </blockquote>

                                        {/* Author */}
                                        <div className="mt-auto">
                                            <div className="font-bold text-gray-900">{testimonial.author}</div>
                                            {testimonial.source && (
                                                <div className="text-sm text-gray-500">Verified {testimonial.source} Review</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Arrow Right */}
                    <button
                        onClick={nextSlide}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 focus:outline-none transition-colors"
                        aria-label="Next testimonial"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestimonialCarousel;
