import React from 'react';

interface DriveWiseLogoProps {
  className?: string;
  size?: number;
  rounded?: boolean;
}

export const DriveWiseLogo: React.FC<DriveWiseLogoProps> = ({
  className = 'w-9 h-9',
  size = 36,
  rounded = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center bg-black overflow-hidden border border-white/[0.14] shrink-0 shadow-sm ${
        rounded ? 'rounded-xl' : 'rounded-none'
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[72%] h-[72%]"
      >
        {/* Minimalist Apex Monogram (D + W + Vanishing Point Highway) */}
        {/* Outer convergence arrow / Highway perspective forming W silhouette */}
        <path
          d="M50 14L86 78H68L50 44L32 78H14L50 14Z"
          fill="#FFFFFF"
        />
        {/* Center route focus line / dash */}
        <path
          d="M47 56H53V78H47V56Z"
          fill="#000000"
        />
        {/* Subtle inner precision vector */}
        <polygon
          points="50,28 62,50 38,50"
          fill="#000000"
        />
        <polygon
          points="50,34 57,48 43,48"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
};

