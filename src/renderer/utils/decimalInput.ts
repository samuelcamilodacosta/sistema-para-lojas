import { formatDecimalInput, parseDecimalInput } from './format';

interface BindDecimalInputOptions {
  defaultValue?: number;
  onValueChange?: () => void;
}

export function bindDecimalInput(
  input: HTMLInputElement,
  options: BindDecimalInputOptions = {},
): void {
  const { defaultValue = 0, onValueChange } = options;

  const applyFormattedValue = (value: number): void => {
    input.value = formatDecimalInput(value);
    onValueChange?.();
  };

  input.addEventListener('blur', () => {
    const parsed = parseDecimalInput(input.value);

    if (Number.isFinite(parsed)) {
      applyFormattedValue(parsed);
      return;
    }

    applyFormattedValue(defaultValue);
  });

  input.addEventListener('input', () => {
    onValueChange?.();
  });

  if (!input.value.trim()) {
    input.value = formatDecimalInput(defaultValue);
  }
}

export function setDecimalInputValue(input: HTMLInputElement, value: number): void {
  input.value = formatDecimalInput(value);
}
