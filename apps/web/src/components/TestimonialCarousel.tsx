'use client';

import React, { useEffect, useState } from 'react';
import { getFrontendApiBaseUrl } from '@/config/env';

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

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const baseUrl = getFrontendApiBaseUrl();
                const response = await fetch(`${baseUrl}/testimonials/active`);
                if (response.ok) {
                    const data = await response.json();
                    setTestimonials(data);
                }
            } catch (error) {
                console.error('Failed to fetch testimonials', error);
            }
        };
        fetchTestimonials();
    }, []);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    if (testimonials.length === 0) return null;

    const visibleTestimonials = Array.from({ length: 4 }).map((_, i) => {
        const index = (currentIndex + i) % testimonials.length;
        return testimonials[index];
    });

    return (
        <section style={{ background: 'var(--color-bg-sand)', padding: '80px 0' }} aria-label="Customer testimonials">
            <div className="container">
                <h2 className="section-title" style={{ marginBottom: '8px' }}>
                    Loved by Teams Big and Small
                </h2>
                <p className="section-subtitle">
                    Real reviews from real customers
                </p>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    {/* Left Arrow — circular nav button (Discovery exception) */}
                    <button
                        onClick={prevSlide}
                        style={{
                            position: 'absolute',
                            left: '-20px',
                            zIndex: 10,
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#fff',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                        aria-label="Previous testimonial"
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Grid */}
                    <div style={{ width: '100%', padding: '0 8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', border: '1px solid var(--color-border)' }}>
                            {visibleTestimonials.map((testimonial, idx) => (
                                <div
                                    key={`${testimonial.id}-${idx}`}
                                    style={{ display: idx > 0 ? undefined : undefined }}
                                    className={idx > 0 ? 'hidden md:block' : ''}
                                >
                                    <div style={{
                                        background: '#fff',
                                        padding: '28px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        minHeight: '200px',
                                    }}>
                                        {/* Stars */}
                                        <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                                            {[...Array(5)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    width="14"
                                                    height="14"
                                                    fill={i < testimonial.rating ? '#B40C1C' : '#DBDBDB'}
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>

                                        {/* Quote */}
                                        <blockquote style={{
                                            fontSize: '14px',
                                            color: 'var(--color-text)',
                                            lineHeight: '1.65',
                                            flex: 1,
                                            marginBottom: '20px',
                                        }}>
                                            &ldquo;{testimonial.content}&rdquo;
                                        </blockquote>

                                        {/* Author */}
                                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)', letterSpacing: '0.02em' }}>
                                                {testimonial.author}
                                            </div>
                                            {testimonial.source && (
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                                    {testimonial.source.includes('Review') ? testimonial.source : `Verified ${testimonial.source} Review`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Arrow */}
                    <button
                        onClick={nextSlide}
                        style={{
                            position: 'absolute',
                            right: '-20px',
                            zIndex: 10,
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#fff',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                        aria-label="Next testimonial"
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </section>
    );
};

export default TestimonialCarousel;
