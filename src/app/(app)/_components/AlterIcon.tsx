/**
 * AlterIcon — flat geometric "clipped circle" representing Alter's identity.
 * A circle with its upper-right corner cut off by a sharp diagonal line.
 */
export function AlterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* M14,3 = ~1 o'clock on circle (center 10,10 r=8)
          A8,8 0 1,0 18,10 = large counterclockwise arc to 3 o'clock
          L14,3 Z = diagonal straight cut back to start */}
      <path d="M14,3 A8,8 0 1,0 18,10 L14,3 Z" fill="#C4A35A" />
    </svg>
  );
}
