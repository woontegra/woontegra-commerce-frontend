import { Link, NavLink } from 'react-router-dom';
import type { ResolvedNavItem } from '../../types/navigationMenu';

type Props = {
  items: ResolvedNavItem[];
  preview?: boolean;
  className?: string;
  linkClassName?: string;
  activeStyle?: React.CSSProperties;
};

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

export function StorefrontNavLinks({
  items,
  preview = false,
  className = '',
  linkClassName = 'font-medium hover:opacity-100 opacity-80 transition-opacity',
  activeStyle,
}: Props) {
  const topLevel = items.filter(i => !i.parentId?.trim());

  return (
    <div className={className || undefined} style={{ display: 'contents' }}>
      {topLevel.map(item => {
        const external = isExternal(item.href);
        if (preview) {
          return (
            <span key={item.id} className={linkClassName}>
              {item.label}
            </span>
          );
        }
        if (external || item.openInNewTab) {
          return (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className={linkClassName}
            >
              {item.label}
            </a>
          );
        }
        return (
          <NavLink
            key={item.id}
            to={item.href}
            className={({ isActive }) =>
              `${linkClassName}${isActive ? ' !opacity-100' : ''}`
            }
            style={({ isActive }) => (isActive && activeStyle ? activeStyle : undefined)}
          >
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}

export function StorefrontFooterNavList({
  items,
  storeLink,
  preview,
  textColor,
}: {
  items: ResolvedNavItem[];
  storeLink?: (path: string) => string;
  preview?: boolean;
  textColor?: string;
}) {
  const topLevel = items.filter(i => !i.parentId?.trim());
  if (topLevel.length === 0) return null;

  return (
    <ul className="space-y-2 text-sm">
      {topLevel.map(item => {
        const external = isExternal(item.href);
        const style = textColor ? { color: textColor } : undefined;
        const label = item.label;
        if (preview) {
          return (
            <li key={item.id}>
              <span className="opacity-80" style={style}>
                {label}
              </span>
            </li>
          );
        }
        if (external || item.openInNewTab) {
          return (
            <li key={item.id}>
              <a href={item.href} target="_blank" rel="noreferrer" className="hover:opacity-100 opacity-80" style={style}>
                {label}
              </a>
            </li>
          );
        }
        const to = storeLink && !item.href.startsWith('/store') ? storeLink(item.href) : item.href;
        return (
          <li key={item.id}>
            <Link to={to} className="hover:opacity-100 opacity-80 transition-opacity" style={style}>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
