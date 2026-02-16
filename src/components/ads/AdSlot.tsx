import type { CSSProperties } from "react";

type AdSlotPreset = "banner" | "leaderboard" | "rectangle" | "skyscraper";

type AdSlotProps = {
  size?: AdSlotPreset;
  width?: number;
  height?: number;
  label?: string;
  className?: string;
  slotId?: string;
  interactive?: boolean;
};

const presetSizes: Record<AdSlotPreset, { width: number; height: number }> = {
  banner: { width: 320, height: 50 },
  leaderboard: { width: 728, height: 90 },
  rectangle: { width: 300, height: 250 },
  skyscraper: { width: 160, height: 600 },
};

export default function AdSlot({
  size = "banner",
  width,
  height,
  label = "Sponsored",
  className,
  slotId,
  interactive = true,
}: AdSlotProps) {
  const resolvedWidth = width ?? presetSizes[size].width;
  const resolvedHeight = height ?? presetSizes[size].height;

  return (
    <aside
      className={`ad-slot ${className ?? ""}`.trim()}
      style={
        {
          "--ad-w": resolvedWidth,
          "--ad-h": resolvedHeight,
        } as CSSProperties
      }
      aria-label={`${label} ad slot`}
    >
      <div className={`ad-slot__frame ${interactive ? "" : "ad-slot__frame--blocked"}`.trim()}>
        <div className="ad-slot__meta">
          <span>{label}</span>
          <span>{resolvedWidth}x{resolvedHeight}</span>
        </div>
        <div className="ad-slot__surface" data-slot-id={slotId ?? "placeholder"}>
          <span>Ad Space</span>
        </div>
        {!interactive ? <div className="ad-slot__shield" aria-hidden="true" /> : null}
      </div>
    </aside>
  );
}
