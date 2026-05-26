"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

gsap.registerPlugin(useGSAP);

const mainItems = [
  ["统一收件箱", "IN", "/inbox"],
  ["重要", "P1", "/inbox?partition=important"],
  ["验证码", "VC", "/inbox?partition=code"],
  ["通知", "NT", "/inbox?partition=notification"],
  ["订阅", "RD", "/inbox?partition=subscription"],
  ["星标", "ST", "/inbox?partition=starred"],
  ["垃圾箱", "TR", "/inbox?view=trash"],
] as const;

const bottomItems = [
  ["账号", "AC", "/mailboxes"],
  ["设置", "SG", "/settings"],
] as const;

const COLLAPSED_RAIL_WIDTH = 92;
const EXPANDED_RAIL_WIDTH = 260;
const PIXEL_COLUMNS = 10;
const PIXEL_ROWS = 30;
const PIXEL_COLOR = "#ffffff";
const PIXEL_FILL_DURATION = 0.9;
const PIXEL_HOLD_DURATION = 0.5;
const PIXEL_CLEAR_DURATION = 0.9;
const RAIL_EXPAND_DURATION = 0.45;

const activeLabelAliases: Record<string, string> = {
  Accounts: "账号",
  Archive: "归档",
  Codes: "验证码",
  Drafts: "草稿",
  Inbox: "统一收件箱",
  Important: "重要",
  Mail: "统一收件箱",
  Notifications: "通知",
  Read: "订阅",
  Search: "搜索",
  Sent: "已发送",
  Settings: "设置",
  Starred: "星标",
  Subscriptions: "订阅",
  Trash: "垃圾箱",
  收件箱: "统一收件箱",
};

function isActiveLabel(active: string, label: string) {
  return active === label || activeLabelAliases[active] === label;
}

type RailItemProps = {
  expanded: boolean;
  href: string;
  isActive: boolean;
  label: string;
  shortLabel: string;
};

function RailItem({
  expanded,
  href,
  isActive,
  label,
  shortLabel,
}: RailItemProps) {
  return (
    <a
      className={`rail-link grid h-12 w-full grid-cols-[48px_minmax(0,1fr)] items-center rounded-2xl border text-left transition-[border-color,background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
        isActive
          ? "border-transparent bg-[#f7f1df] shadow-[0_16px_38px_rgba(247,241,223,0.14)]"
          : "border-transparent bg-transparent hover:border-white/15 hover:bg-white/[0.06]"
      }`}
      href={href}
      style={
        {
          "--rail-hover-ink": isActive ? "#111e1a" : "#f4f5e9",
          "--rail-ink": isActive ? "#111e1a" : "rgba(244,245,233,0.68)",
        } as CSSProperties
      }
      title={label}
      aria-label={label}
    >
      <span className="rail-short grid place-items-center" data-rail-pop>
        {shortLabel}
      </span>
      <span
        className={`rail-label min-w-0 justify-self-start overflow-hidden whitespace-nowrap pr-3 text-left transition-[opacity,filter,transform] duration-500 ${
          expanded
            ? "translate-x-0 opacity-100 blur-0"
            : "-translate-x-2 opacity-0 blur-md"
        }`}
      >
        {label}
      </span>
    </a>
  );
}

export function AetherSidebar({
  active = "统一收件箱",
  details,
}: {
  active?: string;
  connectedAccountCount?: number;
  details?: ReactNode;
}) {
  const railRef = useRef<HTMLElement | null>(null);
  const pixelLayerRef = useRef<HTMLDivElement | null>(null);
  const railTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isOpen = isExpanded || isAnimating;
  const pixelCells = useMemo(
    () => Array.from({ length: PIXEL_ROWS * PIXEL_COLUMNS }),
    [],
  );

  useGSAP(
    () => {
      const pixelLayer = pixelLayerRef.current;

      const cells = pixelLayer
        ? gsap.utils.toArray<HTMLElement>("[data-rail-pixel]", pixelLayer)
        : [];

      gsap.set(pixelLayer, {
        opacity: 0,
        visibility: "hidden",
      });

      gsap.set(cells, {
        opacity: 0,
        scale: 1,
        transformOrigin: "50% 50%",
      });

      return () => {
        railTimelineRef.current?.kill();
      };
    },
    {
      scope: railRef,
    },
  );

  const toggleRail = () => {
    const rail = railRef.current;
    const pixelLayer = pixelLayerRef.current;

    if (!rail || !pixelLayer) return;

    const contentTargets = gsap.utils.toArray<HTMLElement>(
      "[data-rail-content]",
      rail,
    );

    const labelTargets = gsap.utils.toArray<HTMLElement>(".rail-label", rail);

    const brandLabelTargets = gsap.utils.toArray<HTMLElement>(
      ".rail-brand-label",
      rail,
    );

    const cells = gsap.utils.toArray<HTMLElement>(
      "[data-rail-pixel]",
      pixelLayer,
    );

    if (cells.length === 0) return;

    railTimelineRef.current?.kill();

    gsap.killTweensOf([
      rail,
      pixelLayer,
      ...contentTargets,
      ...labelTargets,
      ...brandLabelTargets,
      ...cells,
    ]);

    setDetailsOpen(false);

    /**
     * 收起逻辑：不用 pixel，直接收起。
     */
    if (isExpanded || isAnimating) {
      setIsAnimating(false);
      setIsExpanded(false);

      gsap.set(pixelLayer, {
        opacity: 0,
        visibility: "hidden",
      });

      gsap.set(cells, {
        opacity: 0,
        scale: 1,
      });

      gsap.set(contentTargets, {
        opacity: 1,
        visibility: "visible",
      });

      gsap.set(labelTargets, {
        clearProps: "opacity,visibility,filter,transform",
      });

      gsap.set(brandLabelTargets, {
        clearProps: "opacity,visibility,filter,transform",
      });

      gsap.to(rail, {
        width: COLLAPSED_RAIL_WIDTH,
        duration: 0.35,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          gsap.set(rail, {
            clearProps: "width",
          });
        },
      });

      return;
    }

    /**
     * 展开逻辑：
     * 1. 先变宽
     * 2. 宽度动画结束后跑 pixel transition
     * 3. pixel 消失后再显示 logo / 文字
     */
    setIsAnimating(true);
    setIsExpanded(false);

    const fillOrder = gsap.utils.shuffle([...cells]);
    const clearOrder = gsap.utils.shuffle([...cells]);

    gsap.set(rail, {
      width: COLLAPSED_RAIL_WIDTH,
    });

    gsap.set(contentTargets, {
      opacity: 0,
      visibility: "hidden",
    });

    gsap.set(labelTargets, {
      opacity: 0,
      visibility: "hidden",
      x: -8,
      filter: "blur(8px)",
    });

    gsap.set(brandLabelTargets, {
      opacity: 0,
      visibility: "hidden",
      x: -8,
      filter: "blur(8px)",
    });

    gsap.set(pixelLayer, {
      opacity: 0,
      visibility: "hidden",
    });

    gsap.set(cells, {
      opacity: 0,
      scale: 1,
      transformOrigin: "50% 50%",
    });

    railTimelineRef.current = gsap
      .timeline({
        defaults: {
          ease: "none",
        },
        onComplete: () => {
          setIsExpanded(true);
          setIsAnimating(false);

          gsap.set(rail, {
            clearProps: "width",
          });

          gsap.set(pixelLayer, {
            opacity: 0,
            visibility: "hidden",
          });

          gsap.set(cells, {
            opacity: 0,
            scale: 1,
          });
        },
      })

      /**
       * 第一步：只做侧边栏宽度动画。
       */
      .to(rail, {
        width: EXPANDED_RAIL_WIDTH,
        duration: RAIL_EXPAND_DURATION,
        ease: "power3.inOut",
      })

      /**
       * 第二步：宽度动画完成后，才显示 pixel layer。
       */
      .set(pixelLayer, {
        opacity: 1,
        visibility: "visible",
      })

      /**
       * 第三步：白色像素随机铺满。
       */
      .to(fillOrder, {
        opacity: 1,
        duration: 0,
        stagger: {
          amount: PIXEL_FILL_DURATION,
          from: "random",
        },
      })

      /**
       * 第四步：铺满后停一下。
       */
      .to({}, { duration: PIXEL_HOLD_DURATION })

      /**
       * 第五步：白色像素随机消失。
       */
      .to(clearOrder, {
        opacity: 0,
        duration: 0,
        stagger: {
          amount: PIXEL_CLEAR_DURATION,
          from: "random",
        },
      })

      /**
       * 第六步：pixel 动画结束后，再显示内容。
       */
      .set(pixelLayer, {
        opacity: 0,
        visibility: "hidden",
      })
      .call(() => {
        setIsExpanded(true);
      })
      .set(contentTargets, {
        opacity: 1,
        visibility: "visible",
      })
      .to(
        [...labelTargets, ...brandLabelTargets],
        {
          opacity: 1,
          visibility: "visible",
          x: 0,
          y: 0,
          filter: "blur(0px)",
          duration: 0.28,
          ease: "power2.out",
        },
        "<",
      );
  };

  return (
    <aside
      ref={railRef}
      data-expanded={isExpanded ? "true" : "false"}
      className={`rail-shell fixed bottom-[14px] left-[14px] top-[14px] z-40 hidden flex-col items-center overflow-hidden rounded-[22px] border px-[10px] py-[14px] text-[#f4f5e9] shadow-[0_28px_90px_rgba(0,0,0,0.42)] transition-[background-color,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex ${
        isOpen
          ? "w-[260px] border-white/15 bg-[#071412]/[.92]"
          : "w-[92px] border-white/10 bg-[#071412]/75"
      }`}
    >
      <div
        ref={pixelLayerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
      >
        {pixelCells.map((_, index) => (
          <span
            className="rail-pixel block"
            data-rail-pixel
            key={`rail-pixel-${index}`}
            style={
              {
                "--pixel-color": PIXEL_COLOR,
                height: `${100 / PIXEL_ROWS}%`,
                left: `${(index % PIXEL_COLUMNS) * (100 / PIXEL_COLUMNS)}%`,
                top: `${
                  Math.floor(index / PIXEL_COLUMNS) * (100 / PIXEL_ROWS)
                }%`,
                width: `${100 / PIXEL_COLUMNS}%`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <a
        data-rail-content
        className={`rail-brand-link relative z-20 [height:54px]  grid-cols-[54px_minmax(0,1fr)] items-center overflow-hidden rounded-[18px] text-left transition-[opacity,width] duration-300 ${
          isExpanded ? "w-full opacity-100" : "[width:54px] opacity-100"
        }`}
        href="/inbox"
        title="Glimmail"
        aria-label="Glimmail"
      >
        <div className={`w-full ${isOpen ? "[margin-left:15px] flex items-center" : "flex"}`}>
          <span
            className={`rail-welcome-mark grid shrink-0 place-items-center`}
          >
            GM
          </span>
          <span className="rail-brand-label block max-w-full overflow-hidden whitespace-nowrap pr-3 text-left text-[#f4f5e9] [margin-left:14px]">
            Glimmail
          </span>
        </div>
      </a>

      <nav
        data-rail-content
        className={`relative z-20 mt-5 grid w-full gap-[6px] transition-opacity duration-300 ${"opacity-100"}`}
      >
        {mainItems.map(([label, shortLabel, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <RailItem
              expanded={isExpanded}
              href={href}
              isActive={isActive}
              key={label}
              label={label}
              shortLabel={shortLabel}
            />
          );
        })}
      </nav>

      <div
        data-rail-content
        className={`relative z-20 flex w-full flex-1 items-center cursor-pointer py-4 transition-opacity duration-300 ${isOpen ? "justify-start [padding-left:15px]" : "justify-center"} ${"opacity-100"}`}
      >
        <button
          aria-label={isOpen ? "收起左侧栏" : "展开左侧栏"}
          aria-pressed={isOpen}
          className={`"rail-toggle grid size-11 place-items-center cursor-pointer rounded-[8px] border border-[#8b5cf6]/70 bg-[#8b5cf6]/12 text-[#a78bfa] shadow-[0_0_28px_rgba(139,92,246,0.2)] transition hover:border-[#a78bfa] hover:bg-[#8b5cf6]/20`}
          onClick={toggleRail}
          type="button"
        >
          <span className="grid gap-[5px]" aria-hidden="true">
            <span className="block h-[2px] w-5 rounded-full bg-current" />
            <span className="block h-[2px] w-5 rounded-full bg-current" />
            <span className="block h-[2px] w-5 rounded-full bg-current" />
          </span>
        </button>
      </div>

      <div
        data-rail-content
        className={`relative z-20 grid w-full gap-[6px] transition-opacity duration-300 ${"opacity-100"}`}
      >
        {details ? (
          <>
            <button
              aria-expanded={detailsOpen}
              className={`rail-link grid h-12 w-full grid-cols-[48px_minmax(0,1fr)] cursor-pointer items-center rounded-2xl border text-left transition-[border-color,background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
                detailsOpen
                  ? "border-transparent bg-[#f7f1df] shadow-[0_16px_38px_rgba(247,241,223,0.14)]"
                  : "border-transparent bg-transparent hover:border-white/15 hover:bg-white/[0.06]"
              }`}
              onClick={() => setDetailsOpen((open) => !open)}
              style={
                {
                  "--rail-hover-ink": detailsOpen ? "#111e1a" : "#f4f5e9",
                  "--rail-ink": detailsOpen
                    ? "#111e1a"
                    : "rgba(244,245,233,0.68)",
                } as CSSProperties
              }
              title="更多"
              type="button"
            >
              <span
                className="rail-short grid place-items-center"
                data-rail-pop
              >
                MO
              </span>
              <span
                className={`rail-label min-w-0 justify-self-start overflow-hidden whitespace-nowrap pr-3 text-left transition-[opacity,filter,transform] duration-500 ${
                  isExpanded
                    ? "translate-x-0 opacity-100 blur-0"
                    : "-translate-x-2 opacity-0 blur-md"
                }`}
              >
                更多
              </span>
            </button>
            {detailsOpen ? (
              <div className={`custom-scrollbar fixed bottom-[14px] top-[14px] z-30 hidden w-[330px] overflow-y-auto rounded-[24px] md:block ${
                isOpen ? "left-[288px]" : "left-[120px]"
              }`}>
                {details}
              </div>
            ) : null}
          </>
        ) : null}
        {bottomItems.map(([label, shortLabel, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <RailItem
              expanded={isExpanded}
              href={href}
              isActive={isActive}
              key={label}
              label={label}
              shortLabel={shortLabel}
            />
          );
        })}
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#071412]/[.94] px-4 text-[#f4f5e9] shadow-[0_18px_42px_rgba(0,0,0,0.26)] md:hidden">
      <a className="flex items-center gap-2" href="/inbox">
        <span className="grid size-9 place-items-center rounded-xl bg-[#d7ff47] text-xs font-black text-[#071412]">
          GM
        </span>
        <span className="font-display text-[24px] font-extrabold leading-[1.2] tracking-tight">
          Glimmail
        </span>
      </a>
    </header>
  );
}

type MobileNavItem = readonly [string, string];

const mobileHrefByLabel: Record<string, string> = {
  Accounts: "/mailboxes",
  Inbox: "/inbox",
  Mail: "/inbox",
  Search: "/inbox?view=search",
  Settings: "/settings",
  Starred: "/inbox?view=starred",
  Sent: "/inbox?view=sent",
  Drafts: "/inbox?view=drafts",
  账号: "/mailboxes",
  统一收件箱: "/inbox",
  收件箱: "/inbox",
  搜索: "/inbox?view=search",
  设置: "/settings",
  星标: "/inbox?view=starred",
  已发送: "/inbox?view=sent",
  草稿: "/inbox?view=drafts",
};

export function MobileBottomNav({
  active = "收件箱",
  items = [
    ["inbox", "收件箱"],
    ["star", "星标"],
    ["send", "已发送"],
    ["drafts", "草稿"],
  ] as const,
}: {
  active?: string;
  items?: readonly MobileNavItem[];
}) {
  return (
    <nav className="fixed bottom-0 z-50 grid h-20 w-full grid-cols-4 rounded-t-3xl border-t border-white/10 bg-[#071412]/[.96] px-2 py-2 text-[#f4f5e9] shadow-[0_-18px_42px_rgba(0,0,0,0.28)] md:hidden">
      {items.map(([, label]) => {
        const isActive = isActiveLabel(active, label);

        return (
          <a
            className={`mx-auto flex h-16 min-w-16 flex-col items-center justify-center gap-1 px-2 font-label text-[10px] font-black uppercase tracking-[0.08em] transition ${
              isActive
                ? "text-[#111e1a]"
                : "text-[#f4f5e9]/[.58] hover:text-[#d7ff47]"
            }`}
            href={mobileHrefByLabel[label] ?? "/inbox"}
            key={label}
          >
            <span
              className={`relative z-[1] rounded-[12px] px-3 py-2 ${
                isActive
                  ? "bg-[#f7f1df] text-[#111e1a]"
                  : "text-[#f4f5e9]/[.58]"
              }`}
            >
              {label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
