interface LogoProps {
  className?: string;
  height?: number;
  onClick?: () => void;
}

export function Logo({ className = "", height = 36, onClick }: LogoProps) {
  const width = height * (400 / 120);
  return (
    <svg
      width={width}
      height={height}
      viewBox="8 14 262 88"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
    >
      <rect x="28" y="30" width="38" height="50" rx="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <rect x="16" y="20" width="38" height="50" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <text
        x="68"
        y="68"
        fontFamily="var(--font-space-grotesk), 'Space Grotesk', sans-serif"
        fontSize="54"
        fontWeight="700"
        letterSpacing="-2"
        fill="currentColor"
      >
        JOTDAY
      </text>
    </svg>
  );
}
