export function LogoMark() {
  return (
    <svg width={28} height={28} viewBox="-12 -12 24 24" aria-hidden="true">
      <g stroke="var(--accent)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Fuselage — pointed nose up, narrow tail down */}
        <path d="M 0 -10 L 2.5 0 L 2 7 L 0 10 L -2 7 L -2.5 0 Z" />
        {/* Left swept wing */}
        <path d="M -2 0 L -10 8 L -8 10 L -0.5 5" opacity={0.65} />
        {/* Right swept wing */}
        <path d="M 2 0 L 10 8 L 8 10 L 0.5 5" opacity={0.65} />
      </g>
    </svg>
  );
}
