# Design System Documentation

## Overview

The Bluesky LangApp design system provides a consistent, accessible, and scalable foundation for the user interface. Built on Tailwind CSS with custom components and utilities.

## Color Palette

### Primary Colors
- `primary-50` to `primary-900`: Blue gradient for primary actions and branding
- Main brand color: `primary-600` (#2563eb)

### Semantic Colors

#### Word Status Colors
- **Unknown Words**: `word-unknown-*` (Red palette)
  - Background: `word-unknown-100` (#fee2e2)
  - Text: `word-unknown-700` (#b91c1c)
  - Border: `word-unknown-200` (#fecaca)

- **Learning Words**: `word-learning-*` (Yellow/Orange palette)
  - Background: `word-learning-100` (#fef3c7)
  - Text: `word-learning-700` (#b45309)
  - Border: `word-learning-200` (#fde68a)

- **Known Words**: `word-known-*` (Green palette)
  - Background: `word-known-100` (#dcfce7)
  - Text: `word-known-700` (#15803d)
  - Border: `word-known-200` (#bbf7d0)

### Neutral Colors
- `gray-50` to `gray-900`: Neutral grays with improved contrast ratios

## Typography

### Font Stack
- Primary: System font stack optimized for each platform
- Fallbacks include Segoe UI, Roboto, Helvetica Neue, Arial

### Font Sizes
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px) - Default
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)

### Mobile Considerations
- Minimum 16px font size on mobile to prevent zoom
- Responsive typography with `md:` prefixes for larger screens

## Spacing

### Standard Spacing Scale
- Based on 0.25rem (4px) increments
- Touch-friendly spacing: `touch` (44px), `touch-lg` (48px)

### Responsive Spacing
- Mobile: Smaller padding and margins
- Desktop: Larger, more generous spacing

## Components

### Buttons

#### Variants
- **Primary**: `btn-primary` - Main actions (blue background)
- **Secondary**: `btn-secondary` - Secondary actions (gray background)
- **Danger**: `btn-danger` - Destructive actions (red background)

#### Sizes
- **Small**: `btn + size-sm` - Compact buttons
- **Medium**: `btn + size-md` - Default size
- **Large**: `btn + size-lg` - Prominent actions

#### Features
- Loading states with spinner
- Disabled states
- Focus-visible support
- Touch-friendly minimum height (44px)

### Form Elements

#### Input Fields
- Class: `form-input`
- Consistent padding and border radius
- Focus states with blue ring
- Error states with red styling
- Mobile-optimized font size (16px)

#### Labels and Help Text
- Associated labels for accessibility
- Help text in gray-500
- Error messages in red-600

### Cards
- Class: `card`
- Soft shadow and border
- Hover variant: `card-hover`
- Responsive padding options

### Alerts
- Success: `alert-success` (green)
- Error: `alert-error` (red)
- Warning: `alert-warning` (yellow)
- Info: `alert-info` (blue)

### Badges
- Status badges for word categories
- `status-badge-unknown`, `status-badge-learning`, `status-badge-known`

## Layout

### Container
- Max width: 6xl (72rem)
- Responsive padding: 4 (mobile) to 8 (desktop)

### Grid System
- CSS Grid and Flexbox utilities
- Responsive breakpoints: sm, md, lg, xl
- Additional xs breakpoint for small devices

### Responsive Breakpoints
- `xs`: 475px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## Accessibility Features

### Focus Management
- Visible focus indicators (2px blue outline)
- Focus-visible support for keyboard-only users
- Proper tab order

### Touch Accessibility
- Minimum 44px touch targets
- 48px targets on mobile
- Touch action optimization

### Screen Reader Support
- Semantic HTML structure
- ARIA labels where needed
- Screen reader only text (`.sr-only`)

### High Contrast Support
- Media query for `prefers-contrast: high`
- Enhanced borders and contrast in high contrast mode

### Reduced Motion
- Respects `prefers-reduced-motion: reduce`
- Minimal animations for sensitive users

## Animations

### Subtle Animations
- `animate-fade-in`: Gentle fade in effect
- `animate-slide-up`: Slide up from bottom
- `animate-bounce-gentle`: Subtle bounce effect

### Hover Effects
- Transform and shadow changes
- Color transitions
- Scale effects for interactive elements

## Utilities

### Custom Utilities
- `.touch-spacing`: Responsive padding for touch interfaces
- `.space-y-mobile`: Mobile-specific vertical spacing
- `.truncate-accessible`: Accessible text truncation

### Responsive Utilities
- Mobile-first approach
- Breakpoint prefixes (sm:, md:, lg:, xl:)
- Touch-specific utilities

## Usage Guidelines

### Do's
- Use semantic HTML elements
- Follow the established color palette
- Maintain consistent spacing
- Test with keyboard navigation
- Verify color contrast ratios

### Don'ts
- Don't use custom colors outside the palette
- Don't create touch targets smaller than 44px
- Don't rely solely on color to convey information
- Don't use animations that could trigger vestibular disorders

## Development Workflow

### Component Creation
1. Start with semantic HTML
2. Apply design system classes
3. Add responsive modifiers
4. Test accessibility
5. Document component usage

### Testing Checklist
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Touch targets are adequate size
- [ ] Color contrast meets WCAG AA
- [ ] Works at 200% zoom
- [ ] Responsive on all breakpoints

## Future Enhancements

1. Dark mode support
2. Additional component variants
3. Animation library expansion
4. Enhanced accessibility features
5. Performance optimizations