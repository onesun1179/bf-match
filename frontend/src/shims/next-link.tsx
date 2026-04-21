import type {AnchorHTMLAttributes, ReactNode} from "react";
import {Link as RouterLink} from "react-router-dom";

type HrefValue = string | URL;

type NextLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: HrefValue;
  children: ReactNode;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
};

export default function Link({
  href,
  children,
  replace,
  ...rest
}: NextLinkProps) {
  const to = typeof href === "string" ? href : href.toString();
  return (
    <RouterLink to={to} replace={replace} {...rest}>
      {children}
    </RouterLink>
  );
}
