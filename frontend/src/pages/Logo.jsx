function Logo({ size = 36, tone = "dark", withWordmark = true, className = "" }) {
  const onDark = tone === "light"; // tone = surface the logo sits on
  const wordmarkColor = onDark ? "#F6F8F2" : "#0E241B";
  const buddyColor = "#7FA032"; // deeper lime for legible text at small sizes

  return (
    <span
      className={`bb-logo-unit ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.28 }}
    >
      <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
        <rect width="44" height="44" rx="13" fill="#0F3D2E" />
        <text
          x="22"
          y="31.5"
          textAnchor="middle"
          fontFamily="'Fraunces', serif"
          fontWeight="700"
          fontSize="23"
          fill="#C6F135"
        >
          B
        </text>
        <line x1="30" y1="9.5" x2="24.5" y2="14" stroke="#C6F135" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="30.8" cy="9" r="2.1" fill="#C6F135" />
      </svg>

      {withWordmark && (
        <span
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 600,
            fontSize: size * 0.5,
            color: wordmarkColor,
            letterSpacing: "-0.01em",
          }}
        >
          Budget<span style={{ color: buddyColor }}>Buddy</span>
        </span>
      )}
    </span>
  );
}

export default Logo;