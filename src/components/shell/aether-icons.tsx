type IconProps = {
  children: string;
  className?: string;
  fill?: boolean;
};

const paths: Record<string, string[]> = {
  archive: [
    "M3 7h18",
    "M5 7l1 13h12l1-13",
    "M8 3h8l2 4H6l2-4Z",
    "M10 12h4",
  ],
  arrow_forward: ["M5 12h14", "M13 6l6 6-6 6"],
  content_copy: ["M9 9h10v10H9z", "M5 5h10v10"],
  delete: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 14h10l1-14", "M9 7V4h6v3"],
  drafts: ["M4 6h16v12H4z", "M4 7l8 6 8-6"],
  edit: ["M4 20h4l11-11-4-4L4 16v4Z", "M13 7l4 4"],
  filter_list: ["M4 7h16", "M7 12h10", "M10 17h4"],
  hub: ["M12 12l-5-5", "M12 12l5-5", "M12 12v7", "M7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M17 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M12 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  inbox: ["M4 5h16l-2 14H6L4 5Z", "M4 13h5l2 3h2l2-3h5"],
  light_mode: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M12 4V2", "M12 22v-2", "M4 12H2", "M22 12h-2", "M5 5l1.5 1.5", "M17.5 17.5L19 19", "M19 5l-1.5 1.5", "M6.5 17.5L5 19"],
  lock: ["M7 11h10v9H7z", "M9 11V8a3 3 0 0 1 6 0v3"],
  mail: ["M4 6h16v12H4z", "M4 7l8 6 8-6"],
  more_vert: ["M12 6h.01", "M12 12h.01", "M12 18h.01"],
  notifications: ["M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z", "M10 20h4"],
  search: ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z", "M21 21l-4.3-4.3"],
  send: ["M21 3L10 14", "M21 3l-7 18-4-7-7-4 18-7Z"],
  settings: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M19 12a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7.7 7.7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7.5 7.5 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 2 1.2L10 21h4l.5-2.6a7.7 7.7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z"],
  star: ["M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"],
  star_border: ["M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"],
  visibility: ["M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  visibility_off: ["M3 3l18 18", "M10.6 10.6a3 3 0 0 0 3.8 3.8", "M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.1 4.2", "M6.2 6.8A13 13 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.2-.9"],
};

export function SymbolIcon({ children, className = "" }: IconProps) {
  const iconPaths = paths[children] ?? paths.more_vert;
  const useFill = children === "star";

  return (
    <svg
      aria-hidden="true"
      className={`inline-block size-[1em] shrink-0 ${className}`}
      fill={useFill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={useFill ? 0 : 1.8}
      viewBox="0 0 24 24"
    >
      {iconPaths.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}
