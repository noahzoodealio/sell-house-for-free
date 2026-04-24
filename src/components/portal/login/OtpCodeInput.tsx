"use client";

import { useEffect, useRef, useState, type Ref } from "react";

interface OtpCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function OtpCodeInput({
  length = 6,
  onComplete,
  disabled,
}: OtpCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array(length).fill(""),
  );
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (digits.every((d) => d.length === 1)) {
      onComplete(digits.join(""));
    }
  }, [digits, onComplete]);

  function updateDigit(index: number, next: string) {
    setDigits((prev) => {
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  }

  function handleChange(index: number, raw: string) {
    const onlyDigits = raw.replace(/\D/g, "");
    if (onlyDigits.length === 0) {
      updateDigit(index, "");
      return;
    }
    if (onlyDigits.length > 1) {
      // Paste of multiple digits — distribute across subsequent slots.
      const chunks = onlyDigits.slice(0, length - index).split("");
      setDigits((prev) => {
        const copy = [...prev];
        chunks.forEach((c, i) => {
          copy[index + i] = c;
        });
        return copy;
      });
      const nextIndex = Math.min(length - 1, index + chunks.length);
      inputsRef.current[nextIndex]?.focus();
      return;
    }
    updateDigit(index, onlyDigits);
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex gap-2" role="group" aria-label="One-time code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-12 rounded-lg border-2 border-surface-edge text-center text-2xl font-semibold focus:border-brand focus:outline-none disabled:opacity-50"
        />
      ))}
    </div>
  );
}
