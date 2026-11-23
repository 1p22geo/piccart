'use client';

type Props = {
  min?: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};

export function QtyStepper({ min = 1, max, value, onChange }: Props) {
  return (
    <div className="qty-stepper">
      <button type="button" data-testid="qty-minus" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label="minus">
        −
      </button>
      <span data-testid="qty-value" aria-live="polite">{value}</span>
      <button type="button" data-testid="qty-plus" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label="plus">
        +
      </button>
    </div>
  );
}
