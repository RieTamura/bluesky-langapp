# Accessibility Guidelines

## Overview

This document outlines the accessibility features and guidelines implemented in the Bluesky LangApp frontend to ensure WCAG 2.1 AA compliance and provide an inclusive user experience.

## Key Accessibility Features

### 1. Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus indicators are clearly visible with 2px blue outline
- Tab order follows logical flow
- Skip links available for main content areas

### 2. Touch Accessibility
- Minimum touch target size of 44px (WCAG AA standard)
- Larger 48px touch targets on mobile devices
- Touch-friendly spacing and padding
- Proper touch action handling to prevent accidental interactions

### 3. Visual Accessibility
- High contrast color scheme with WCAG AA compliant contrast ratios
- Support for high contrast mode preferences
- Scalable text that works up to 200% zoom
- Clear visual hierarchy with proper heading structure

### 4. Screen Reader Support
- Semantic HTML structure with proper landmarks
- ARIA labels and descriptions where needed
- Screen reader only text for context
- Proper form labeling and error announcements

### 5. Motor Accessibility
- Reduced motion support for users with vestibular disorders
- Large click/touch areas
- No time-based interactions that can't be extended
- Alternative input method support

## Component Accessibility

### Buttons
- Proper semantic button elements
- Clear focus states
- Loading states announced to screen readers
- Disabled state properly communicated

### Forms
- Associated labels for all inputs
- Error messages linked to inputs via aria-describedby
- Required fields properly marked
- Help text provided for complex inputs

### Word Highlighting
- Keyboard accessible word selection
- Screen reader announcements for word status
- High contrast support for word categories
- Touch-friendly interaction areas

### Navigation
- Proper landmark roles
- Current page indication
- Mobile-friendly hamburger menu with proper ARIA states
- Keyboard accessible menu toggle

## Color and Contrast

### Word Status Colors
- Unknown words: Red with 4.5:1 contrast ratio
- Learning words: Yellow/Orange with 4.5:1 contrast ratio  
- Known words: Green with 4.5:1 contrast ratio

### Interactive Elements
- Primary buttons: Blue with white text (7:1 contrast)
- Secondary buttons: Gray with dark text (4.5:1 contrast)
- Links: Blue with 4.5:1 contrast ratio

## Mobile Accessibility

### Touch Targets
- Minimum 44px touch targets (WCAG AA)
- 48px targets on mobile for better usability
- Adequate spacing between interactive elements
- No overlapping touch areas

### Text Input
- 16px minimum font size to prevent zoom on iOS
- Proper input types for better mobile keyboards
- Clear labels and placeholder text
- Error states clearly indicated

## Testing Guidelines

### Manual Testing
1. Navigate entire app using only keyboard
2. Test with screen reader (NVDA, JAWS, VoiceOver)
3. Verify color contrast with tools like WebAIM
4. Test at 200% zoom level
5. Verify touch targets on mobile devices

### Automated Testing
- Use axe-core for automated accessibility testing
- Lighthouse accessibility audits
- Color contrast analyzers
- Keyboard navigation testing tools

## Implementation Notes

### CSS Classes
- `.sr-only` for screen reader only content
- `.focus-visible` for enhanced focus states
- Touch-friendly utilities in Tailwind config
- High contrast mode media queries

### JavaScript
- Proper focus management for dynamic content
- ARIA live regions for status updates
- Keyboard event handling for custom interactions
- Reduced motion preference detection

## Future Improvements

1. Add skip links for main navigation
2. Implement ARIA live regions for dynamic updates
3. Add keyboard shortcuts for power users
4. Enhance screen reader announcements for learning progress
5. Add voice control support considerations

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Guidelines](https://webaim.org/)
- [MDN Accessibility Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)