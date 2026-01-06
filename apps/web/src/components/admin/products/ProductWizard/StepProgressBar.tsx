'use client';

/**
 * Step Progress Bar Component
 * 步骤进度条组件
 * Created: 2025-01-06
 */
import React from 'react';

interface StepProgressBarProps {
  currentStep: number;
  steps: Array<{ id: number; label: string }>;
  onStepClick?: (step: number) => void;
}

const steps = [
  { id: 1, label: '基础信息' },
  { id: 2, label: '变体设置' },
  { id: 3, label: '详情完善' },
  { id: 4, label: '预览发布' },
];

export function StepProgressBar({ currentStep, steps = steps, onStepClick }: StepProgressBarProps) {
  return (
    <div className="step-progress-bar">
      <div className="step-progress-bar__container">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isClickable = onStepClick && (isCompleted || isActive);

          return (
            <React.Fragment key={step.id}>
              <div
                className={`step-progress-bar__step ${
                  isActive ? 'step-progress-bar__step--active' : ''
                } ${isCompleted ? 'step-progress-bar__step--completed' : ''} ${
                  isClickable ? 'step-progress-bar__step--clickable' : ''
                }`}
                onClick={() => isClickable && onStepClick?.(step.id)}
              >
                <div className="step-progress-bar__step-number">
                  {isCompleted ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.667 5L7.5 14.167 3.333 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="step-progress-bar__step-label">{step.label}</div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`step-progress-bar__connector ${
                    isCompleted ? 'step-progress-bar__connector--completed' : ''
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style jsx>{`
        .step-progress-bar {
          width: 100%;
          padding: 24px 0;
          background: #fff;
          border-bottom: 1px solid #e1e3e5;
        }

        .step-progress-bar__container {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .step-progress-bar__step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .step-progress-bar__step--clickable {
          cursor: pointer;
        }

        .step-progress-bar__step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          background: #f6f6f7;
          color: #8c9196;
          border: 2px solid #e1e3e5;
          transition: all 0.3s ease;
        }

        .step-progress-bar__step--active .step-progress-bar__step-number {
          background: #005bd3;
          color: #fff;
          border-color: #005bd3;
        }

        .step-progress-bar__step--completed .step-progress-bar__step-number {
          background: #008060;
          color: #fff;
          border-color: #008060;
        }

        .step-progress-bar__step--clickable:hover .step-progress-bar__step-number {
          transform: scale(1.1);
        }

        .step-progress-bar__step-label {
          font-size: 14px;
          color: #6d7175;
          font-weight: 400;
          white-space: nowrap;
        }

        .step-progress-bar__step--active .step-progress-bar__step-label {
          color: #202223;
          font-weight: 600;
        }

        .step-progress-bar__step--completed .step-progress-bar__step-label {
          color: #202223;
        }

        .step-progress-bar__connector {
          width: 120px;
          height: 2px;
          background: #e1e3e5;
          margin: 0 16px;
          position: relative;
          top: -20px;
          transition: background 0.3s ease;
        }

        .step-progress-bar__connector--completed {
          background: #008060;
        }

        @media (max-width: 768px) {
          .step-progress-bar__container {
            padding: 0 16px;
          }

          .step-progress-bar__step-label {
            font-size: 12px;
          }

          .step-progress-bar__connector {
            width: 60px;
            margin: 0 8px;
          }

          .step-progress-bar__step-number {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}

