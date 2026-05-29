'use client';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

export function StarRating({ rating, max = 5, size = 'md', interactive = false, onChange }: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <span className={`inline-flex gap-0.5 ${sizeClass[size]}`} aria-label={`${rating} out of ${max} stars`}>
      {stars.map((star) => {
        const filled = star <= Math.floor(rating);
        const half = !filled && star - 0.5 <= rating;

        return (
          <span
            key={star}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''} leading-none`}
            style={{ color: filled || half ? '#f59e0b' : '#d1d5db' }}
            onClick={interactive && onChange ? () => onChange(star) : undefined}
            role={interactive ? 'button' : undefined}
            aria-label={interactive ? `Rate ${star} star${star > 1 ? 's' : ''}` : undefined}
          >
            {filled ? '★' : half ? '⯨' : '☆'}
          </span>
        );
      })}
    </span>
  );
}

interface StarPickerProps {
  value: number;
  onChange: (v: number) => void;
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-2xl leading-none transition-transform hover:scale-110 focus:outline-none"
          style={{ color: star <= value ? '#f59e0b' : '#d1d5db' }}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
