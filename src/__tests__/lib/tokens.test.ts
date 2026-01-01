/**
 * Tests for animation token configurations
 */

import {
  springs,
  clockDigitVariants,
  staggerContainer,
  staggerItem,
  fadeInUp,
  fadeOnly,
  easings,
  durations,
} from '@/lib/tokens';

describe('Animation Tokens', () => {
  describe('springs', () => {
    it('should have gentle spring configuration', () => {
      expect(springs.gentle).toEqual({
        type: 'spring',
        stiffness: 120,
        damping: 20,
      });
    });

    it('should have snappy spring configuration', () => {
      expect(springs.snappy).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
    });

    it('should have bouncy spring configuration', () => {
      expect(springs.bouncy).toEqual({
        type: 'spring',
        stiffness: 400,
        damping: 25,
      });
    });
  });

  describe('easings', () => {
    it('should have defined easing curves', () => {
      expect(easings.out).toEqual([0.0, 0.0, 0.2, 1]);
      expect(easings.in).toEqual([0.4, 0.0, 1, 1]);
      expect(easings.inOut).toEqual([0.4, 0.0, 0.2, 1]);
    });
  });

  describe('durations', () => {
    it('should have defined durations', () => {
      expect(durations.fast).toBe(0.15);
      expect(durations.normal).toBe(0.3);
      expect(durations.slow).toBe(0.5);
    });
  });

  describe('clockDigitVariants', () => {
    it('should have initial state with opacity 0', () => {
      expect(clockDigitVariants.initial.opacity).toBe(0);
    });

    it('should have animate state with opacity 1', () => {
      expect(clockDigitVariants.animate.opacity).toBe(1);
    });

    it('should have exit state with opacity 0', () => {
      expect(clockDigitVariants.exit.opacity).toBe(0);
    });

    it('should define y-axis translations for waterfall effect', () => {
      expect(clockDigitVariants.initial.y).toBe(40);
      expect(clockDigitVariants.animate.y).toBe(0);
      expect(clockDigitVariants.exit.y).toBe(-40);
    });
  });

  describe('stagger animations', () => {
    it('should have staggerContainer with delayChildren', () => {
      expect(staggerContainer.animate.transition.delayChildren).toBe(0.2);
      expect(staggerContainer.animate.transition.staggerChildren).toBe(0.1);
    });

    it('should have staggerItem with fadeInUp pattern', () => {
      expect(staggerItem.initial.opacity).toBe(0);
      expect(staggerItem.animate.opacity).toBe(1);
      expect(staggerItem.initial.y).toBe(20);
      expect(staggerItem.animate.y).toBe(0);
    });
  });

  describe('fade animations', () => {
    it('should have fadeInUp with y translation', () => {
      expect(fadeInUp.initial.opacity).toBe(0);
      expect(fadeInUp.initial.y).toBe(20);
      expect(fadeInUp.animate.opacity).toBe(1);
      expect(fadeInUp.animate.y).toBe(0);
    });

    it('should have fadeOnly without y translation', () => {
      expect(fadeOnly.initial.opacity).toBe(0);
      expect(fadeOnly.animate.opacity).toBe(1);
      expect(fadeOnly.initial.y).toBeUndefined();
      expect(fadeOnly.animate.y).toBeUndefined();
    });
  });
});
