import { Link, NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
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

function childrenOf(items: ResolvedNavItem[], parentId: string): ResolvedNavItem[] {
  return items.filter(i => i.parentId === parentId);
}

function NavItemLink({
  item,
  preview,
  linkClassName,
  activeStyle,
}: {
  item: ResolvedNavItem;
  preview?: boolean;
  linkClassName: string;
  activeStyle?: React.CSSProperties;
}) {
  const external = isExternal(item.href);
  if (preview) {
    return <span className={linkClassName}>{item.label}</span>;
  }
  if (external || item.openInNewTab) {
    return (
      <a
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
      to={item.href}
      className={({ isActive }) =>
        `${linkClassName}${isActive ? ' !opacity-100' : ''}`
      }
      style={({ isActive }) => (isActive && activeStyle ? activeStyle : undefined)}
    >
      {item.label}
    </NavLink>
  );
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
        const children = childrenOf(items, item.id);
        if (children.length === 0) {
          return (
            <NavItemLink
              key={item.id}
              item={item}
              preview={preview}
              linkClassName={linkClassName}
              activeStyle={activeStyle}
            />
          );
        }
        return (
          <div key={item.id} className="relative group">
            <div className="inline-flex items-center gap-0.5">
              <NavItemLink
                item={item}
                preview={preview}
                linkClassName={linkClassName}
                activeStyle={activeStyle}
              />
              <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0 pointer-events-none" aria-hidden />
            </div>
            <div
              className={`absolute left-0 top-full pt-1 min-w-[10rem] z-50 ${
                preview ? 'block static pt-0 min-w-0' : 'hidden group-hover:block group-focus-within:block'
              }`}
            >
              <div
                className={
                  preview
                    ? 'flex flex-col gap-1 pl-3 mt-1 border-l border-current/20'
                    : 'rounded-md border border-slate-200 bg-white py-1 shadow-lg'
                }
              >
                {children.map(child => (
                  <div key={child.id} className={preview ? '' : 'px-1'}>
                    {preview ? (
                      <span className={`${linkClassName} text-sm`}>{child.label}</span>
                    ) : (
                      <NavItemLink
                        item={child}
                        linkClassName={`${linkClassName} block px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 rounded`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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

  const renderLink = (item: ResolvedNavItem, className = '') => {
    const external = isExternal(item.href);
    const style = textColor ? { color: textColor } : undefined;
    const label = item.label;
    if (preview) {
      return (
        <span className={`opacity-80 ${className}`} style={style}>
          {label}
        </span>
      );
    }
    if (external || item.openInNewTab) {
      return (
        <a
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className={`hover:opacity-100 opacity-80 ${className}`}
          style={style}
        >
          {label}
        </a>
      );
    }
    const to = storeLink && !item.href.startsWith('/store') ? storeLink(item.href) : item.href;
    return (
      <Link
        to={to}
        className={`hover:opacity-100 opacity-80 transition-opacity ${className}`}
        style={style}
      >
        {label}
      </Link>
    );
  };

  return (
    <ul className="space-y-2 text-sm">
      {topLevel.map(item => {
        const children = childrenOf(items, item.id);
        return (
          <li key={item.id}>
            {renderLink(item)}
            {children.length > 0 && (
              <ul className="mt-1.5 ml-3 space-y-1.5 border-l border-current/15 pl-3">
                {children.map(child => (
                  <li key={child.id}>{renderLink(child, 'text-[13px]')}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
