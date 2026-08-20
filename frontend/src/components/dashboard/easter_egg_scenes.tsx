/**
 * The four places the hidden walk goes through, drawn rather than photographed so they
 * weigh nothing and follow the festival's colours. The first one steps aside for an
 * uploaded picture when there is one.
 */

const SKY = '#2b3035';
const CONCRETE = '#4a4f55';
const CONCRETE_DARK = '#3a3f45';
const RUST = '#8a5a3a';
const DARKNESS = '#0d0f11';
const LEAF = '#2f7714';
const LEAF_LIGHT = '#4fc924';
const BARK = '#5a4632';

function Treetops() {
  return (
    <>
      <circle cx="70" cy="70" r="58" fill={LEAF} opacity="0.9" />
      <circle cx="150" cy="46" r="46" fill={LEAF_LIGHT} opacity="0.55" />
      <circle cx="330" cy="58" r="52" fill={LEAF} opacity="0.85" />
      <circle cx="420" cy="80" r="62" fill={LEAF} opacity="0.9" />
      <circle cx="250" cy="30" r="40" fill={LEAF_LIGHT} opacity="0.4" />
    </>
  );
}

export function HangarOutside() {
  return (
    <svg viewBox="0 0 500 320" width="100%" role="img" aria-hidden>
      <rect width="500" height="320" fill={SKY} />
      <Treetops />

      {/* The earth-covered bunker, its concrete streaked with rust. */}
      <path d="M60 300 L60 150 Q250 60 440 150 L440 300 Z" fill={CONCRETE} />
      <path d="M60 300 L60 150 Q250 60 440 150 L440 300 Z" fill="url(#streaks)" opacity="0.5" />
      <defs>
        <linearGradient id="streaks" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={RUST} stopOpacity="0.7" />
          <stop offset="60%" stopColor={RUST} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* The mouth of it, black even in daylight. */}
      <path d="M195 300 L195 190 Q250 140 305 190 L305 300 Z" fill={DARKNESS} />
      <path
        d="M195 300 L195 190 Q250 140 305 190 L305 300 Z"
        fill="none"
        stroke="#1b1e21"
        strokeWidth="6"
      />

      {/* Faded numbers stencilled either side, the way they are on the real thing. */}
      <text x="120" y="215" fill={RUST} fontSize="30" fontWeight="700" opacity="0.6">
        02
      </text>
      <text x="352" y="215" fill={RUST} fontSize="30" fontWeight="700" opacity="0.6">
        02
      </text>

      <rect y="300" width="500" height="20" fill="#3d4348" />
      <path d="M215 320 L235 300 L265 300 L285 320 Z" fill={CONCRETE_DARK} />
    </svg>
  );
}

export function HangarInside() {
  return (
    <svg viewBox="0 0 500 320" width="100%" role="img" aria-hidden>
      <rect width="500" height="320" fill={DARKNESS} />

      {/* Ribs of the vault, running away from you. */}
      {[0, 1, 2, 3, 4].map((rib) => {
        const inset = rib * 34;
        return (
          <path
            key={rib}
            d={`M${40 + inset} 320 L${40 + inset} ${170 + rib * 12} Q250 ${
              70 + rib * 26
            } ${460 - inset} ${170 + rib * 12} L${460 - inset} 320`}
            fill="none"
            stroke="#20262b"
            strokeWidth="3"
          />
        );
      })}

      {/* Daylight at the far end: the way out, and the way on. */}
      <ellipse cx="250" cy="215" rx="46" ry="58" fill="#5d6b52" opacity="0.35" />
      <ellipse cx="250" cy="220" rx="30" ry="40" fill="#8fae74" opacity="0.55" />
      <ellipse cx="250" cy="225" rx="16" ry="24" fill="#cfe3b8" opacity="0.75" />
    </svg>
  );
}

export function Forest({ onTree }: { onTree: () => void }) {
  return (
    <svg viewBox="0 0 500 320" width="100%" role="img" aria-hidden>
      <rect width="500" height="320" fill="#22301f" />
      <Treetops />
      <rect y="250" width="500" height="70" fill="#2b3a26" />

      {[40, 130, 350, 440].map((x) => (
        <rect key={x} x={x} y="120" width="26" height="140" rx="4" fill={BARK} opacity="0.75" />
      ))}

      {/* The one worth looking at. The mark is small on purpose. */}
      <g onClick={onTree} style={{ cursor: 'pointer' }}>
        <rect x="232" y="96" width="42" height="168" rx="6" fill={BARK} />
        <rect x="232" y="96" width="14" height="168" rx="6" fill="#6b5540" opacity="0.6" />
        <path
          d="M244 168 L262 186 M262 168 L244 186"
          stroke="#efe0c8"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
      </g>
    </svg>
  );
}

export function Digging({ depth }: { depth: number }) {
  const hole = 12 + depth * 16;
  return (
    <svg viewBox="0 0 500 320" width="100%" role="img" aria-hidden>
      <rect width="500" height="320" fill="#22301f" />
      <Treetops />
      <rect y="200" width="500" height="120" fill="#4a3a28" />
      <rect y="200" width="500" height="10" fill="#3d5c2f" />

      <rect x="232" y="60" width="42" height="140" rx="6" fill={BARK} />
      <path
        d="M244 128 L262 146 M262 128 L244 146"
        stroke="#efe0c8"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />

      <ellipse cx="250" cy="248" rx={40 + depth * 10} ry={hole} fill="#2a2018" />
      <ellipse cx="250" cy={244} rx={34 + depth * 9} ry={hole * 0.8} fill={DARKNESS} />

      {/* Spoil piling up beside the hole as it gets deeper. */}
      <ellipse
        cx={330 + depth * 4}
        cy="268"
        rx={18 + depth * 7}
        ry={7 + depth * 3}
        fill="#5b4732"
      />
    </svg>
  );
}

export function BucketReward() {
  return (
    <svg viewBox="0 0 500 320" width="100%" role="img" aria-hidden>
      <rect width="500" height="320" fill="#22301f" />
      <Treetops />
      <rect y="240" width="500" height="80" fill="#4a3a28" />

      <g transform="translate(250 180)">
        {/* Handle behind the pail. */}
        <path
          d="M-72 -10 Q0 -110 72 -10"
          fill="none"
          stroke="#b9c0c7"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <rect x="-26" y="-66" width="52" height="14" rx="7" fill="#1f2328" />

        {/* Galvanised pail: wider at the rim than at the foot. */}
        <path d="M-78 -14 L78 -14 L58 108 L-58 108 Z" fill="#c4cbd2" />
        <path d="M-78 -14 L-30 -14 L-22 108 L-58 108 Z" fill="#dfe5ea" opacity="0.7" />
        <path d="M40 -14 L78 -14 L58 108 L30 108 Z" fill="#9aa2aa" opacity="0.6" />
        <path d="M-70 34 L70 34" stroke="#8e969e" strokeWidth="4" />
        <path d="M-66 66 L66 66" stroke="#8e969e" strokeWidth="4" />

        {/* Heaped to a peak, and spilling over the rim. */}
        <ellipse cx="0" cy="-14" rx="78" ry="16" fill="#eef1f4" />
        <path d="M-70 -16 Q-30 -74 0 -78 Q30 -74 70 -16 Z" fill="#fbfcfd" />
        <path d="M-40 -20 Q-14 -56 0 -60 Q14 -56 40 -20 Z" fill="#ffffff" opacity="0.85" />
      </g>
    </svg>
  );
}
