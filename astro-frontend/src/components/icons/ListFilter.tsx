import React from 'react';

type Props = {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
};

export const ListFilter: React.FC<Props> = ({ size = 18, className, 'aria-hidden': ariaHidden = true }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    className={className}
    aria-hidden={ariaHidden}
  >
    {/* simple list + filter/funnel glyph */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h12M4 12h8M4 18h12" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 6l-4 6v4" />
  </svg>
);

export default ListFilter;
