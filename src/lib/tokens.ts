/**
 * Magic Mirror Design System - Animation Tokens
 * For use with Framer Motion
 */

// ============================================
// EASINGS
// ============================================
export const easings = {
  out: [0.0, 0.0, 0.2, 1],
  in: [0.4, 0.0, 1, 1],
  inOut: [0.4, 0.0, 0.2, 1],
  spring: [0.34, 1.56, 0.64, 1],
} as const;

// Spring configs for Framer Motion
export const springs = {
  gentle: { type: "spring", stiffness: 120, damping: 20 },
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  bouncy: { type: "spring", stiffness: 400, damping: 25 },
} as const;

// ============================================
// DURATIONS (in seconds for Framer Motion)
// ============================================
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

// ============================================
// OPACITY LEVELS
// ============================================
export const opacity = {
  hero: 1,
  primary: 0.87,
  secondary: 0.6,
  tertiary: 0.38,
  disabled: 0.2,
  hint: 0.1,
} as const;

// ============================================
// SPACING (in pixels)
// ============================================
export const spacing = {
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  8: 64,
  10: 80,
  12: 96,
  16: 128,
} as const;

// ============================================
// TYPOGRAPHY
// ============================================
export const fontSize = {
  "6xl": 180,
  "5xl": 128,
  "4xl": 96,
  "3xl": 64,
  "2xl": 48,
  xl: 36,
  lg: 28,
  base: 21,
  sm: 16,
  xs: 12,
} as const;

export const fontWeight = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
} as const;

// ============================================
// ANIMATION VARIANTS
// Pre-built Framer Motion variants
// ============================================

/**
 * Fade in from below - standard presence animation
 */
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: durations.slow, ease: easings.out },
};

/**
 * Fade only - for subtle state changes
 */
export const fadeOnly = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durations.normal },
};

/**
 * Clock digit "Waterfall of Time" transition
 * Current digit fades up and out, new digit drops in from above
 */
export const clockDigitVariants = {
  initial: { y: 40, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -40, opacity: 0 },
};

export const clockDigitTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

/**
 * Stagger children animation
 */
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Scale pulse - for emphasis
 */
export const scalePulse = {
  initial: { scale: 1 },
  animate: { scale: 1.02 },
  transition: { duration: 0.2 },
};

/**
 * Breathing animation - for ambient elements
 */
export const breathingAnimation = {
  animate: {
    opacity: [1, 0.7, 1],
    transition: {
      duration: 3,
      ease: "easeInOut" as const,
      repeat: Infinity,
    },
  },
};

/**
 * Glow breathing - for hero text
 */
export const glowBreathing = {
  animate: {
    textShadow: [
      "0 0 20px rgba(255, 255, 255, 0.1)",
      "0 0 40px rgba(255, 255, 255, 0.2)",
      "0 0 20px rgba(255, 255, 255, 0.1)",
    ],
    transition: {
      duration: 4,
      ease: "easeInOut" as const,
      repeat: Infinity,
    },
  },
};

/**
 * Separator pulse - for clock colon
 */
export const separatorPulse = {
  animate: {
    opacity: [1, 0.2, 1],
    transition: {
      duration: 2,
      ease: "easeInOut" as const,
      repeat: Infinity,
    },
  },
};

// ============================================
// LAYOUT CONSTANTS
// ============================================
export const layout = {
  containerWidth: 1080,
  containerHeight: 2560,
  marginX: 48,
  marginY: 64,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get stagger delay for nth child
 */
export function getStaggerDelay(index: number, baseDelay = 0.1): number {
  return index * baseDelay;
}

/**
 * Create transition with custom duration
 */
export function createTransition(
  duration: keyof typeof durations = "normal",
  ease: keyof typeof easings = "out"
) {
  return {
    duration: durations[duration],
    ease: easings[ease],
  };
}

/**
 * Create a breathing animation with custom timing
 */
export function createBreathingAnimation(
  durationSeconds: number = 3,
  minOpacity: number = 0.7
) {
  return {
    animate: {
      opacity: [1, minOpacity, 1],
      transition: {
        duration: durationSeconds,
        ease: "easeInOut" as const,
        repeat: Infinity,
      },
    },
  };
}
