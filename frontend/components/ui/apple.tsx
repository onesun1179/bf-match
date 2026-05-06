"use client";

import styled from "@emotion/styled";
import Link from "next/link";

export const PageShell = styled.main<{center?: boolean}>`
  min-height: 100vh;
  padding: 32px 16px 88px;
  ${({center}) => center ? `
    display: grid;
    align-content: center;
  ` : ""}
`;

export const ContentStack = styled.section<{max?: number; gap?: number}>`
  width: 100%;
  max-width: ${({max = 520}) => max}px;
  margin: 0 auto;
  display: grid;
  gap: ${({gap = 14}) => gap}px;
`;

export const SurfaceCard = styled.div<{padding?: string}>`
  padding: ${({padding = "20px 22px"}) => padding};
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: 1px solid var(--hairline);
  display: grid;
`;

export const UtilitySurface = styled.div`
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background: var(--surface-2);
`;

export const Eyebrow = styled.p`
  margin: 0;
  color: var(--brand);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
`;

export const DisplayTitle = styled.h1<{size?: number}>`
  margin: 8px 0 0;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: ${({size = 34}) => size}px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  color: var(--ink-secondary);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
`;

export const MutedText = styled.p<{size?: number}>`
  margin: 0;
  color: var(--muted);
  font-size: ${({size = 14}) => size}px;
  line-height: 1.47;
`;

export const InlineLink = styled.a`
  color: var(--brand);
  font-weight: 600;
  text-decoration: none;
`;

export const PrimaryButton = styled.button`
  min-height: 44px;
  border-radius: var(--radius-pill);
  border: 0;
  background: var(--brand);
  color: var(--on-primary);
  font-size: 17px;
  font-weight: 400;
  cursor: pointer;

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const PrimaryLink = styled.a`
  min-height: 44px;
  border-radius: var(--radius-pill);
  border: 0;
  background: var(--brand);
  color: var(--on-primary);
  font-size: 17px;
  font-weight: 400;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:active {
    transform: scale(0.95);
  }
`;

export const SecondaryButton = styled.button`
  min-height: 44px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--brand);
  background: transparent;
  color: var(--brand);
  font-size: 17px;
  font-weight: 400;
  cursor: pointer;

  &:active {
    transform: scale(0.95);
  }
`;

export const PillInput = styled.input`
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line-2);
  padding: 0 18px;
  background: var(--surface);
  color: var(--ink);
  font-size: 17px;
  outline: none;
`;

export const PillSelect = styled.select`
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line-2);
  padding: 0 18px;
  background: var(--surface);
  color: var(--ink);
  font-size: 17px;
  outline: none;
`;

export const SegmentedControl = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--line);
`;

export const SegmentButton = styled.button<{selected?: boolean}>`
  flex: 1;
  min-height: 40px;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: ${({selected}) => selected ? "var(--brand)" : "transparent"};
  color: ${({selected}) => selected ? "var(--on-primary)" : "var(--muted)"};
  font-size: 14px;
  font-weight: ${({selected}) => selected ? 600 : 400};
  cursor: pointer;
`;

export const FilterChip = styled.button<{selected?: boolean}>`
  min-height: 34px;
  padding: 0 14px;
  border-radius: var(--radius-pill);
  border: 1px solid ${({selected}) => selected ? "var(--brand)" : "var(--hairline)"};
  background: ${({selected}) => selected ? "var(--brand)" : "var(--surface)"};
  color: ${({selected}) => selected ? "var(--on-primary)" : "var(--muted)"};
  font-size: 14px;
  font-weight: ${({selected}) => selected ? 600 : 400};
  cursor: pointer;
  white-space: nowrap;
`;

export const BottomFrostedNav = styled.nav`
  position: fixed;
  bottom: env(safe-area-inset-bottom);
  left: 50%;
  width: min(560px, 100%);
  transform: translateX(-50%);
  display: flex;
  justify-content: space-between;
  gap: 4px;
  background: var(--glass-strong);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 0;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  z-index: 100;
`;

export const BottomTab = styled.a<{selected?: boolean}>`
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  min-height: 52px;
  padding: 7px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid ${({selected}) => selected ? "var(--hairline)" : "transparent"};
  background: ${({selected}) => selected ? "var(--surface)" : "transparent"};
  color: ${({selected}) => selected ? "var(--brand)" : "var(--muted)"};
  font-weight: ${({selected}) => selected ? 600 : 400};
  text-decoration: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
`;

export const BottomTabLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "selected",
})<{selected?: boolean}>`
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  min-height: 52px;
  padding: 7px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid ${({selected}) => selected ? "var(--hairline)" : "transparent"};
  background: ${({selected}) => selected ? "var(--surface)" : "transparent"};
  color: ${({selected}) => selected ? "var(--brand)" : "var(--muted)"};
  font-weight: ${({selected}) => selected ? 600 : 400};
  text-decoration: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
`;

export const MetricTile = styled.div`
  border-radius: var(--radius-sm);
  padding: 10px 8px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  text-align: center;
`;
