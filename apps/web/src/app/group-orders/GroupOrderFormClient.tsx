/**
 * Group Order Form Client Component
 * [2025-01-30 12:00:00] 使用 frontend-design 设计 Group Order Form 页面
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buildNewDesignUrl } from '@/utils/designUrl'; // [2025-12-08 14:40:00] 使用新的 Design Lab URL 构建器
import './group-orders.css';

export function GroupOrderFormClient() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  // [2025-01-30 12:00:00] 特性列表
  const features = [
    {
      id: 1,
      title: 'Designed with groups in mind',
      description: 'Getting your group together in custom gear has never been easier. We\'ve simplified the process so that you can focus on your group\'s experience. Now everyone can place their own orders, find and enter their sizes, pay for their items, and even have them shipped directly to their homes.',
      icon: '👥',
    },
    {
      id: 2,
      title: 'Money managed',
      description: 'No more collecting cash. Now all your participants can purchase products themselves.',
      icon: '💳',
    },
    {
      id: 3,
      title: 'Sizes simplified',
      description: "Don't take a guess. Let your group members select their own sizes using our unique Sizing Line-Up feature.",
      icon: '📏',
    },
    {
      id: 4,
      title: 'Shipping streamlined',
      description: 'Your gear shipped your way. Get it all in one big box or ship packages individually to your group members homes.',
      icon: '📦',
    },
  ];

  // [2025-01-30 12:00:00] 步骤说明
  const steps = [
    {
      number: 1,
      title: 'Create a design',
      description: "Head to the Design Lab to create your design. When you're finished, hit save.",
    },
    {
      number: 2,
      title: 'Start a group order',
      description: "After you save, you'll have the chance to start a group order.",
    },
    {
      number: 3,
      title: 'Share with your group',
      description: "It's easy for everyone to choose their own sizes and pay for orders.",
    },
  ];

  // [2025-01-30 12:00:00] 客户评价
  const testimonials = [
    {
      id: 1,
      quote: "Fantastic experience! Customer service was very helpful when making last minute changes to the order. The group order form was easy and convenient!",
      author: 'Ellen M.',
      role: 'Team Captain',
      location: 'CrossFit Cohasset, MA',
    },
    {
      id: 2,
      quote: "I've ordered a number of times before, and this is the first I've used the group order form. It was great! Made the task so much easier. I'll do it again.",
      author: 'Julie O.',
      location: 'Barnhart, MO',
    },
  ];

  return (
    <div className="group-order-page">
      {/* [2025-01-30 12:00:00] Hero 区域 */}
      <section className="group-order-hero">
        <div className="group-order-hero__container">
          <h1 className="group-order-hero__title">
            Group orders <span className="group-order-hero__title-accent">made easy</span>
          </h1>
          <p className="group-order-hero__subtitle">
            Easily collect sizes and payments with our online Group Order Form, developed with you in mind. Save a design to get started.
          </p>
          <div className="group-order-hero__actions">
            <Link href="/design-gallery" className="group-order-btn group-order-btn--primary">
              Use an existing design
            </Link>
            <Link 
              href={buildNewDesignUrl({ variantId: 'default', referrer: 'group_order' })} 
              className="group-order-btn group-order-btn--secondary"
            >
              Start a new design
            </Link>
          </div>
        </div>
      </section>

      {/* [2025-01-30 12:00:00] 特性展示区域 */}
      <section className="group-order-features">
        <div className="group-order-features__container">
          <div className="group-order-features__grid">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className="group-order-feature-card"
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="group-order-feature-card__icon">
                  <span className="group-order-feature-card__icon-emoji">{feature.icon}</span>
                </div>
                <h3 className="group-order-feature-card__title">{feature.title}</h3>
                <p className="group-order-feature-card__description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* [2025-01-30 12:00:00] How it works 部分 */}
      <section className="group-order-steps">
        <div className="group-order-steps__container">
          <h2 className="group-order-steps__title">How it works</h2>
          <div className="group-order-steps__grid">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="group-order-step-card"
                style={{
                  animationDelay: `${index * 0.15}s`,
                }}
              >
                <div className="group-order-step-card__number">{step.number}</div>
                <h3 className="group-order-step-card__title">{step.title}</h3>
                <p className="group-order-step-card__description">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* [2025-01-30 12:00:00] 客户评价部分 */}
      <section className="group-order-testimonials">
        <div className="group-order-testimonials__container">
          <h2 className="group-order-testimonials__title">Group ordering is getting buzz</h2>
          <div className="group-order-testimonials__grid">
            {testimonials.map((testimonial) => (
              <blockquote key={testimonial.id} className="group-order-testimonial-card">
                <p className="group-order-testimonial-card__quote">&ldquo;{testimonial.quote}&rdquo;</p>
                <footer className="group-order-testimonial-card__author">
                  <cite className="group-order-testimonial-card__name">{testimonial.author}</cite>
                  {testimonial.role && (
                    <span className="group-order-testimonial-card__role"> - {testimonial.role}</span>
                  )}
                  <span className="group-order-testimonial-card__location"> {testimonial.location}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* [2025-01-30 12:00:00] CTA 区域 */}
      <section className="group-order-cta">
        <div className="group-order-cta__container">
          <h2 className="group-order-cta__title">Ready to get started?</h2>
          <div className="group-order-cta__actions">
            <Link href="/design-gallery" className="group-order-btn group-order-btn--primary group-order-btn--large">
              Use an existing design
            </Link>
            <Link 
              href={buildNewDesignUrl({ variantId: 'default', referrer: 'group_order' })} 
              className="group-order-btn group-order-btn--secondary group-order-btn--large"
            >
              Start a new design
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

