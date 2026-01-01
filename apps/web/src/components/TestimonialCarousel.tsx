'use client';

import React, { useEffect, useState } from 'react';

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

    // Fetch testimonials
    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/testimonials/active`);
                if (response.ok) {
                    const data = await response.json();
                    // Take up to 12 items for 3 rows x 4 columns layout
                    setTestimonials(data.slice(0, 12));
                }
            } catch (error) {
                console.error('Failed to fetch testimonials', error);
            }
        };
        fetchTestimonials();
    }, []);

    if (testimonials.length === 0) return null;

    return (
        <div className="w-full bg-gray-50 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
                    Loved by teams big and small
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.id} className="h-full">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow duration-200">
                                {/* Rating */}
                                <div className="flex space-x-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <svg
                                            key={i}
                                            className={`h-4 w-4 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>

                                {/* Content */}
                                <blockquote className="text-gray-700 italic mb-4 flex-grow text-sm">
                                    &ldquo;{testimonial.content}&rdquo;
                                </blockquote>

                                {/* Author */}
                                <div className="mt-auto pt-4 border-t border-gray-50">
                                    <div className="font-bold text-gray-900 text-sm">{testimonial.author}</div>
                                    {testimonial.source && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {testimonial.source.includes('Review') ? testimonial.source : `Verified ${testimonial.source} Review`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TestimonialCarousel;
