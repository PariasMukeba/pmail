"use client";

import type { ReactNode } from "react";

interface ScrollLinkProps {
  targetId: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

/** Scrolls to a section by id without pushing a new history entry. */
export function ScrollLink({ targetId, className, children, onClick }: ScrollLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${targetId}`);
    onClick?.();
  };

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
