"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export interface HeroSlide {
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
  /** Tailwind gradient stops for the left-side text scrim */
  tint: string;
}

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 50;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Sliding promo carousel: swipe/drag on touch and mouse, arrows on every
 * screen size, keyboard support, and an autoplay progress indicator that
 * pauses on hover, while dragging and when the tab is hidden.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [dragPct, setDragPct] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"x" | "y" | null>(null);
  const moved = useRef(false);
  const widthRef = useRef(1);
  const dragPx = useRef(0);
  const rootRef = useRef<HTMLElement>(null);

  const paused = hovered || dragging || tabHidden;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Autoplay is driven by the active dot's progress animation (see onAnimationEnd),
  // so pausing freezes the timer and the indicator together.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true
  );
  const autoplay = count > 1 && !reducedMotion;

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = null;
    moved.current = false;
    widthRef.current = rootRef.current?.offsetWidth || 1;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axis.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis.current === "x") {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* pointer already released — dragging still works without capture */
        }
      }
    }
    if (axis.current === "x") {
      moved.current = true;
      dragPx.current = dx;
      setDragPct((dx / widthRef.current) * 100);
    }
  };

  const endDrag = () => {
    if (!dragging) return;
    if (axis.current === "x") {
      if (dragPx.current < -SWIPE_THRESHOLD) next();
      else if (dragPx.current > SWIPE_THRESHOLD) prev();
    }
    dragPx.current = 0;
    setDragPct(0);
    setDragging(false);
    axis.current = null;
  };

  // Don't follow the slide link after a swipe
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
    }
  };

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        endDrag();
      }}
      className="group/hero relative overflow-hidden rounded-2xl bg-black shadow-pop ring-1 ring-black/5 focus-visible:outline-offset-4"
    >
      {/* Track */}
      <div
        className={`flex touch-pan-y select-none ${dragging ? "" : "transition-transform duration-[650ms] [transition-timing-function:cubic-bezier(0.22,0.8,0.24,1)]"}`}
        style={{ transform: `translate3d(${-index * 100 + dragPct}%,0,0)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${s.title}`}
              aria-hidden={!active}
              className="relative h-[260px] w-full shrink-0 sm:h-[340px] md:h-[400px] lg:h-[460px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                draggable={false}
                fetchPriority={i === 0 ? "high" : "low"}
                className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[7000ms] ease-out ${
                  active ? "scale-105" : "scale-100"
                }`}
              />
              <div className={`absolute inset-0 bg-gradient-to-r ${s.tint} to-transparent`} />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
              {/* the logo's red slash, as a soft accent */}
              <div
                className="pointer-events-none absolute -right-16 top-0 hidden h-full w-48 skew-x-[-20deg] bg-gradient-to-b from-brand/45 via-brand/10 to-transparent sm:block"
                aria-hidden="true"
              />

              <div className="absolute inset-0 flex items-center px-5 pb-8 sm:px-16 sm:pb-0 lg:px-20">
                <div
                  key={active ? `on-${index}` : "off"}
                  className={`max-w-[75%] text-white sm:max-w-lg ${active ? "animate-fade-up" : "opacity-0"}`}
                >
                  <span className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/90 sm:mb-3 sm:text-[11px]"><span className="slash" aria-hidden="true" />{s.tag}</span>
                  <h2 className="text-[26px] font-bold leading-[1.04] drop-shadow-lg sm:text-5xl lg:text-6xl">
                    {s.title}
                  </h2>
                  <p className="mt-3 line-clamp-2 hidden max-w-md text-sm text-white/80 sm:block md:text-base">{s.subtitle}</p>
                  <Link
                    href={s.href}
                    tabIndex={active ? 0 : -1}
                    draggable={false}
                    className="btn btn-primary btn-sm group/cta mt-4 sm:mt-6 sm:px-6 sm:py-2.5 sm:text-[15px]"
                  >
                    {s.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          {/* Arrows — always visible on touch, appear on hover with a mouse */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute bottom-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-black shadow-md backdrop-blur transition hover:bg-white sm:bottom-auto sm:left-4 sm:top-1/2 sm:h-11 sm:w-11 sm:-translate-y-1/2 md:opacity-0 md:group-hover/hero:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-black shadow-md backdrop-blur transition hover:bg-white sm:bottom-auto sm:right-4 sm:top-1/2 sm:h-11 sm:w-11 sm:-translate-y-1/2 md:opacity-0 md:group-hover/hero:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>

          {/* Dots with autoplay progress */}
          <div className="absolute bottom-[14px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-sm sm:bottom-4">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                  i === index ? "w-8 bg-white/35" : "w-1.5 bg-white/60 hover:bg-white"
                }`}
              >
                {i === index &&
                  (autoplay ? (
                    <span
                      key={index}
                      className="absolute inset-0 origin-left rounded-full bg-white"
                      style={{
                        animation: `grow-x ${AUTOPLAY_MS}ms linear forwards`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                      onAnimationEnd={next}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-full bg-white" />
                  ))}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default HeroCarousel;
