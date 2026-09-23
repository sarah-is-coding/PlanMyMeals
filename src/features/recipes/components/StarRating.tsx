const STAR_VALUES = [1, 2, 3, 4, 5];

type StarRatingProps = {
  value: number | null;
  onChange?: (nextValue: number | null) => void;
  size?: "sm" | "md";
  label?: string;
  disabled?: boolean;
};

export default function StarRating({
  value,
  onChange,
  size = "md",
  label = "Rating",
  disabled = false,
}: StarRatingProps) {
  const sizeClass = size === "sm" ? " star-rating--sm" : "";

  if (!onChange) {
    if (!value) {
      return null;
    }

    return (
      <div
        className={`star-rating star-rating--readonly${sizeClass}`}
        role="img"
        aria-label={`Rated ${value} out of 5 stars`}
      >
        {STAR_VALUES.map((starValue) => (
          <span key={starValue} className="star-rating__star" aria-hidden="true">
            {starValue <= value ? "★" : "☆"}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`star-rating${sizeClass}`}
      role="radiogroup"
      aria-label={label}
    >
      {STAR_VALUES.map((starValue) => (
        <button
          key={starValue}
          type="button"
          role="radio"
          aria-checked={value === starValue}
          aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
          className="star-rating__star star-rating__star--button"
          disabled={disabled}
          onClick={() => onChange(value === starValue ? null : starValue)}
        >
          {value !== null && starValue <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
