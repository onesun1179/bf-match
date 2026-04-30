"use client";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {CSSProperties, ReactNode, useEffect, useRef, useState} from "react";

type PullToRefreshProps = {
  children: ReactNode;
};

const REFRESH_THRESHOLD = 72;
const MAX_PULL_DISTANCE = 110;

export function PullToRefresh({children}: PullToRefreshProps) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const ready = pullDistance >= REFRESH_THRESHOLD;
  const visibleDistance = refreshing ? REFRESH_THRESHOLD : pullDistance;
  const progress = Math.min(visibleDistance / REFRESH_THRESHOLD, 1);

  useEffect(() => {
    function updatePullDistance(distance: number) {
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    }

    function resetPull() {
      pullingRef.current = false;
      startXRef.current = 0;
      startYRef.current = 0;
      updatePullDistance(0);
    }

    function handleTouchStart(event: TouchEvent) {
      if (refreshingRef.current || window.scrollY > 0 || shouldIgnoreTarget(event.target)) return;
      const touch = event.touches[0];
      if (!touch) return;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      pullingRef.current = true;
    }

    function handleTouchMove(event: TouchEvent) {
      if (!pullingRef.current || refreshingRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;
      if (deltaY <= 0) {
        resetPull();
        return;
      }
      if (Math.abs(deltaX) > deltaY) {
        resetPull();
        return;
      }
      if (window.scrollY > 0) {
        resetPull();
        return;
      }

      event.preventDefault();
      const easedDistance = Math.min(MAX_PULL_DISTANCE, deltaY * 0.55);
      updatePullDistance(easedDistance);
    }

    function handleTouchEnd() {
      if (!pullingRef.current || refreshingRef.current) return;
      const shouldRefresh = pullDistanceRef.current >= REFRESH_THRESHOLD;
      if (!shouldRefresh) {
        resetPull();
        return;
      }

      refreshingRef.current = true;
      pullingRef.current = false;
      setRefreshing(true);
      updatePullDistance(REFRESH_THRESHOLD);
      window.setTimeout(() => {
        window.location.reload();
      }, 120);
    }

    window.addEventListener("touchstart", handleTouchStart, {passive: true});
    window.addEventListener("touchmove", handleTouchMove, {passive: false});
    window.addEventListener("touchend", handleTouchEnd, {passive: true});
    window.addEventListener("touchcancel", resetPull, {passive: true});

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", resetPull);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden={visibleDistance === 0 && !refreshing}
        role="status"
        style={{
          ...indicator,
          opacity: visibleDistance > 0 || refreshing ? 1 : 0,
          transform: `translate3d(-50%, ${Math.max(-56, visibleDistance - 56)}px, 0)`,
        }}
      >
        <RefreshRoundedIcon
          style={{
            ...indicatorIcon,
            transform: `rotate(${refreshing ? 360 : progress * 180}deg)`,
            transition: refreshing ? "transform .6s linear" : "transform .12s ease-out",
          }}
        />
        <span style={indicatorText}>{refreshing ? "새로고침 중" : ready ? "놓으면 새로고침" : "새로고침"}</span>
      </div>
      {children}
    </>
  );
}

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, [contenteditable='true'], [data-pull-refresh-ignore='true']"));
}

const indicator: CSSProperties = {
  position: "fixed",
  top: 0,
  left: "50%",
  zIndex: 2000,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 38,
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(15, 18, 26, 0.92)",
  border: "1px solid var(--line-2)",
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.34)",
  color: "var(--ink)",
  pointerEvents: "none",
  transition: "opacity .12s ease-out, transform .12s ease-out",
};
const indicatorIcon: CSSProperties = {
  width: 18,
  height: 18,
  color: "var(--brand-light)",
};
const indicatorText: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
