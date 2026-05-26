"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";
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

const cipherChars = "01AEIMNPRSTVXZ#*:/[]{}<>+=~";

function cipherSlotCount(label: string) {
  return Math.max(Array.from(label).length + 4, 7);
}

function cipherGlyph(label: string, index: number, phase = 0) {
  const seed = Array.from(label).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );

  return cipherChars[(seed + index * 7 + phase * 11) % cipherChars.length];
}

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
  href: string;
  isActive: boolean;
  label: string;
  shortLabel: string;
};

function RailItem({
  href,
  isActive,
  label,
  shortLabel,
}: RailItemProps) {
  const labelCharacters = Array.from(label);
  const letterSlots = Array.from({ length: cipherSlotCount(label) });

  return (
    <a
      className={`rail-link grid h-12 w-full grid-cols-[48px_minmax(0,1fr)] items-center rounded-2xl border transition-[border-color,background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
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
      <span className="rail-label min-w-0 overflow-hidden whitespace-nowrap pr-3">
        {letterSlots.map((_, characterIndex) => (
          <span
            aria-hidden="true"
            className="rail-letter inline-block"
            data-rail-letter
            data-cipher={cipherGlyph(label, characterIndex)}
            data-final={labelCharacters[characterIndex] ?? ""}
            key={`${label}-${characterIndex}`}
          >
            {cipherGlyph(label, characterIndex)}
          </span>
        ))}
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
  const railRef = useRef<HTMLElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const brandCharacters = Array.from("Glimmail");

  useGSAP((_, contextSafe) => {
    const rail = railRef.current;
    if (!rail) return;
    const safe =
      contextSafe ??
      (<T extends (...args: never[]) => unknown>(callback: T) => callback);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const links = gsap.utils.toArray<HTMLElement>(".rail-link", rail);
    const labels = gsap.utils.toArray<HTMLElement>(
      ".rail-label, .rail-brand-label",
      rail,
    );
    const letters = gsap.utils.toArray<HTMLElement>("[data-rail-letter]", rail);
    const popTargets = gsap.utils.toArray<HTMLElement>("[data-rail-pop]", rail);
    const brandLink = rail.querySelector<HTMLElement>(".rail-brand-link");

    const resetCipherText = () => {
      labels.forEach((label) => {
        gsap.utils
          .toArray<HTMLElement>("[data-rail-letter]", label)
          .forEach((letter) => {
            letter.textContent = letter.dataset.cipher ?? "";
          });
      });
    };

    const setCollapsed = () => {
      resetCipherText();
      gsap.set(rail, {
        backgroundColor: "rgba(7,20,18,0.75)",
        borderColor: "rgba(255,255,255,0.1)",
        width: 92,
      });
      gsap.set(links, { width: 48 });
      gsap.set(brandLink, { width: 54 });
      gsap.set(labels, { autoAlpha: 0 });
      gsap.set(letters, {
        autoAlpha: 0,
        clearProps: "color,filter,width",
        x: -8,
      });
      gsap.set(popTargets, { clearProps: "transform" });
    };

    const decryptLabels = (timeline: gsap.core.Timeline, startAt: number) => {
      labels.forEach((label, labelIndex) => {
        const labelLetters = gsap.utils.toArray<HTMLElement>(
          "[data-rail-letter]",
          label,
        );
        const finalLetters = labelLetters.filter(
          (letter) => letter.dataset.final,
        );
        const extraLetters = labelLetters.filter(
          (letter) => !letter.dataset.final,
        );
        const seedText =
          finalLetters.map((letter) => letter.dataset.final ?? "").join("") ||
          label.textContent ||
          "";
        const labelStart = startAt + labelIndex * 0.075;
        const stepCount = Math.max(finalLetters.length + 7, 10);
        const stepDuration = 0.065;

        timeline
          .set(
            labelLetters,
            {
              autoAlpha: 1,
              color: "#4fd7ff",
              filter: "blur(0.4px)",
              width: "auto",
              x: -4,
            },
            labelStart,
          )
          .to(
            labelLetters,
            {
              color: "#d7ff47",
              duration: 0.16,
              stagger: 0.012,
            },
            labelStart + 0.1,
          );

        Array.from({ length: stepCount + 1 }).forEach((_, step) => {
          const stepAt = labelStart + step * stepDuration;

          timeline.call(
            () => {
              const lockedCount = Math.min(
                finalLetters.length,
                Math.floor((step / stepCount) * (finalLetters.length + 1)),
              );

              labelLetters.forEach((letter, letterIndex) => {
                const finalCharacter = letter.dataset.final ?? "";

                if (finalCharacter && letterIndex < lockedCount) {
                  letter.textContent = finalCharacter;
                  return;
                }

                letter.textContent = cipherGlyph(seedText, letterIndex, step);
              });
            },
            undefined,
            stepAt,
          );
        });

        const finishAt = labelStart + stepCount * stepDuration;

        timeline
          .to(
            extraLetters,
            {
              autoAlpha: 0,
              duration: 0.32,
              ease: "power3.inOut",
              width: 0,
              x: -3,
            },
            finishAt - 0.18,
          )
          .call(
            () => {
              labelLetters.forEach((letter) => {
                letter.textContent = letter.dataset.final ?? "";
              });
            },
            undefined,
            finishAt + 0.04,
          )
          .to(
            finalLetters,
            {
              clearProps: "color,filter,width",
              duration: 0.36,
              ease: "expo.out",
              stagger: 0.018,
              x: 0,
            },
            finishAt,
          );
      });
    };

    const expandRail = safe(() => {
      gsap.killTweensOf([rail, brandLink, ...links, ...labels, ...letters, ...popTargets]);

      if (reduceMotion.matches) {
        gsap.set(rail, {
          backgroundColor: "rgba(7,20,18,0.92)",
          borderColor: "rgba(255,255,255,0.15)",
          width: 236,
        });
        gsap.set(links, { width: "100%" });
        gsap.set(brandLink, { width: "100%" });
        gsap.set(labels, { autoAlpha: 1 });
        letters.forEach((letter) => {
          letter.textContent = letter.dataset.final ?? "";
        });
        gsap.set(letters, { autoAlpha: 1, x: 0 });
        return;
      }

      const timeline = gsap.timeline();

      timeline
        .to(rail, {
          backgroundColor: "rgba(7,20,18,0.92)",
          borderColor: "rgba(255,255,255,0.15)",
          duration: 1.55,
          ease: "power4.inOut",
          width: 236,
        })
        .to(
          [brandLink, ...links],
          {
            duration: 1.38,
            ease: "power4.inOut",
            stagger: 0.015,
            width: "100%",
          },
          0.05,
        )
        .set(labels, { autoAlpha: 1 }, 0.85)
        .set(
          letters,
          { autoAlpha: 1, clearProps: "color,filter", x: -6, width: "auto" },
          0.85,
        )
        .fromTo(
          popTargets,
          { rotation: 0, scale: 1, x: 0, y: 0 },
          {
            duration: 0.86,
            ease: "expo.out",
            keyframes: [
              { rotation: -7, scaleX: 1.12, scaleY: 0.88, y: -7 },
              { rotation: 7, scaleX: 0.92, scaleY: 1.12, x: 5, y: 2 },
              { rotation: -5, scaleX: 1.06, scaleY: 0.96, x: -4, y: -2 },
              { rotation: 2, scaleX: 0.98, scaleY: 1.02, x: 2, y: 0 },
              { rotation: 0, scale: 1, x: 0, y: 0 },
            ],
            stagger: 0.055,
          },
          0.08,
        );

      decryptLabels(timeline, 0.85);
    });

    const collapseRail = safe(() => {
      gsap.killTweensOf([rail, brandLink, ...links, ...labels, ...letters, ...popTargets]);

      if (reduceMotion.matches) {
        setCollapsed();
        return;
      }

      gsap
        .timeline()
        .to(labels, { autoAlpha: 0, duration: 0.12, ease: "power2.out" }, 0)
        .to(
          letters,
          {
            autoAlpha: 0,
            clearProps: "color,filter,width",
            duration: 0.12,
            ease: "power2.out",
            x: -8,
          },
          0,
        )
        .to([brandLink, ...links], { duration: 0.36, ease: "expo.out", width: 48 }, 0)
        .to(brandLink, { duration: 0.36, ease: "expo.out", width: 54 }, 0)
        .to(
          rail,
          {
            backgroundColor: "rgba(7,20,18,0.75)",
            borderColor: "rgba(255,255,255,0.1)",
            duration: 0.58,
            ease: "power3.out",
            width: 92,
          },
          0,
        )
        .set(popTargets, { clearProps: "transform" })
        .call(resetCipherText);
    });

    setCollapsed();
    rail.addEventListener("pointerenter", expandRail);
    rail.addEventListener("pointerleave", collapseRail);
    rail.addEventListener("focusin", expandRail);
    rail.addEventListener("focusout", collapseRail);

    return () => {
      rail.removeEventListener("pointerenter", expandRail);
      rail.removeEventListener("pointerleave", collapseRail);
      rail.removeEventListener("focusin", expandRail);
      rail.removeEventListener("focusout", collapseRail);
      gsap.killTweensOf([rail, brandLink, ...links, ...labels, ...letters, ...popTargets]);
    };
  }, { scope: railRef });

  return (
    <aside
      className="rail-shell fixed bottom-[14px] left-[14px] top-[14px] z-40 hidden w-[92px] flex-col items-center overflow-hidden rounded-[22px] border border-white/10 bg-[#071412]/75 px-[10px] py-[14px] text-[#f4f5e9] shadow-[0_28px_90px_rgba(0,0,0,0.42)] md:flex"
      ref={railRef}
    >
      <a
        className="rail-brand-link grid h-[54px] w-[54px] grid-cols-[54px_minmax(0,1fr)] items-center gap-3 overflow-hidden"
        href="/inbox"
        title="Glimmail"
        aria-label="Glimmail"
      >
        <span
          className="rail-welcome-mark grid shrink-0 place-items-center"
          data-rail-pop
        >
          GM
        </span>
        <span className="rail-brand-label overflow-hidden whitespace-nowrap text-[#f4f5e9]">
          {Array.from({ length: cipherSlotCount("Glimmail") }).map(
            (_, characterIndex) => (
              <span
                aria-hidden="true"
                className="rail-letter inline-block"
                data-rail-letter
                data-cipher={cipherGlyph("Glimmail", characterIndex)}
                data-final={brandCharacters[characterIndex] ?? ""}
                key={`glimmail-${characterIndex}`}
              >
                {cipherGlyph("Glimmail", characterIndex)}
              </span>
            ),
          )}
        </span>
      </a>

      <nav className="mt-7 grid w-full gap-[10px]">
        {mainItems.map(([label, shortLabel, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <RailItem
              href={href}
              isActive={isActive}
              key={label}
              label={label}
              shortLabel={shortLabel}
            />
          );
        })}
      </nav>

      <div className="mt-auto grid w-full gap-[10px]">
        {details ? (
          <>
            <button
              aria-expanded={detailsOpen}
              className={`rail-link grid h-12 w-full grid-cols-[48px_minmax(0,1fr)] items-center rounded-2xl border text-left transition-[border-color,background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
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
              <span className="rail-short grid place-items-center" data-rail-pop>
                MO
              </span>
              <span className="rail-label min-w-0 overflow-hidden whitespace-nowrap pr-3">
                {Array.from({ length: cipherSlotCount("更多") }).map(
                  (_, characterIndex) => (
                    <span
                      aria-hidden="true"
                      className="rail-letter inline-block"
                      data-rail-letter
                      data-cipher={cipherGlyph("更多", characterIndex)}
                      data-final={Array.from("更多")[characterIndex] ?? ""}
                      key={`more-${characterIndex}`}
                    >
                      {cipherGlyph("更多", characterIndex)}
                    </span>
                  ),
                )}
              </span>
            </button>
            {detailsOpen ? (
              <div className="custom-scrollbar fixed bottom-[14px] left-[264px] top-[14px] z-30 hidden w-[330px] overflow-y-auto rounded-[24px] md:block">
                {details}
              </div>
            ) : null}
          </>
        ) : null}
        {bottomItems.map(([label, shortLabel, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <RailItem
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
