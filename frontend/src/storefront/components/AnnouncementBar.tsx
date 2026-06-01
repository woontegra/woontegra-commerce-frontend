import { Link } from 'react-router-dom';
import '../../styles/announcementBar.css';
import {
  fontWeightCss,
  mergeAnnouncementBarSettings,
  resolveAnnouncementDisplayText,
  shouldRenderAnnouncementBar,
  type AnnouncementBarSettings,
} from '../../utils/announcementBarHelpers';

type AnnouncementBarProps = {
  settings: AnnouncementBarSettings | Record<string, unknown>;
  preview?: boolean;
  previewViewport?: 'desktop' | 'tablet' | 'mobile';
  resolveHref?: (path: string) => string;
};

function alignClass(align: string): string {
  if (align === 'left') return 'justify-start text-left';
  if (align === 'right') return 'justify-end text-right';
  return 'justify-center text-center';
}

function MarqueeContent({ text, speed, repeat }: { text: string; speed: number; repeat: boolean }) {
  const duration = Math.max(8, Math.min(60, speed));
  return (
    <div className="announcement-bar-marquee">
      <div
        className={`announcement-bar-marquee-track${repeat ? '' : ' announcement-bar-marquee-track--once'}`}
        style={{ animationDuration: `${duration}s` }}
      >
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
    </div>
  );
}

function BarContent({
  settings,
  viewport,
  preview,
}: {
  settings: AnnouncementBarSettings;
  viewport: 'desktop' | 'mobile';
  preview?: boolean;
}) {
  const { primary, secondary } = resolveAnnouncementDisplayText(settings, viewport);
  const isMarquee =
    settings.mode === 'marquee' && (viewport === 'desktop' || settings.marqueeOnMobile);
  const isSplit = settings.layout === 'split' && !isMarquee;

  if (preview && !primary && !(isSplit && secondary)) {
    return <span className="opacity-70 italic">Duyuru metni girin</span>;
  }

  if (isMarquee && primary) {
    return <MarqueeContent text={primary} speed={settings.marqueeSpeed} repeat={settings.marqueeRepeat} />;
  }

  if (isSplit && (primary || secondary)) {
    return (
      <div className="flex w-full items-center justify-between gap-4 px-3 sm:px-4">
        <span className="truncate min-w-0">{primary || '\u00A0'}</span>
        <span className="truncate min-w-0 text-right shrink-0 max-w-[50%]">{secondary || '\u00A0'}</span>
      </div>
    );
  }

  return <span className="px-3 sm:px-4 line-clamp-2">{primary}</span>;
}

function AnnouncementBarLayer({
  settings,
  viewport,
  preview,
  resolveHref,
  className,
}: {
  settings: AnnouncementBarSettings;
  viewport: 'desktop' | 'mobile';
  preview?: boolean;
  resolveHref: (path: string) => string;
  className: string;
}) {
  if (!shouldRenderAnnouncementBar(settings, viewport, { preview, allowEmptyPreview: preview })) {
    return null;
  }

  const barStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
    fontSize: `${Math.max(10, settings.fontSizePx - (viewport === 'mobile' ? 1 : 0))}px`,
    fontWeight: fontWeightCss(settings.fontWeight),
    minHeight: `${Math.max(24, settings.heightPx - (viewport === 'mobile' ? 4 : 0))}px`,
  };

  const inner = (
    <div className={`flex items-center w-full overflow-hidden ${alignClass(settings.align)}`} style={barStyle}>
      <BarContent settings={settings} viewport={viewport} preview={preview} />
    </div>
  );

  const linkUrl = settings.linkUrl.trim();
  if (!preview && settings.linkEnabled && linkUrl) {
    const isExternal = /^https?:\/\//i.test(linkUrl);
    if (isExternal) {
      return (
        <a
          href={linkUrl}
          target={settings.linkTarget}
          rel={settings.linkTarget === '_blank' ? 'noopener noreferrer' : undefined}
          className={`block w-full hover:opacity-95 transition-opacity ${className}`}
        >
          {inner}
        </a>
      );
    }
    const path = linkUrl.startsWith('/') ? linkUrl : `/${linkUrl}`;
    return (
      <Link to={resolveHref(path)} className={`block w-full hover:opacity-95 transition-opacity ${className}`}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function AnnouncementBar({
  settings: rawSettings,
  preview = false,
  previewViewport,
  resolveHref = p => p,
}: AnnouncementBarProps) {
  const settings = mergeAnnouncementBarSettings(rawSettings);

  if (previewViewport === 'mobile') {
    return (
      <AnnouncementBarLayer
        settings={settings}
        viewport="mobile"
        preview={preview}
        resolveHref={resolveHref}
        className="w-full"
      />
    );
  }

  if (previewViewport === 'desktop' || previewViewport === 'tablet') {
    return (
      <AnnouncementBarLayer
        settings={settings}
        viewport="desktop"
        preview={preview}
        resolveHref={resolveHref}
        className="w-full"
      />
    );
  }

  const showDesktop = settings.showOnDesktop;
  const showMobile = settings.showOnMobile;
  if (!showDesktop && !showMobile) return null;

  const desktopLayer = showDesktop ? (
    <AnnouncementBarLayer
      settings={settings}
      viewport="desktop"
      preview={preview}
      resolveHref={resolveHref}
      className={`w-full ${showMobile ? 'hidden md:block' : ''}`}
    />
  ) : null;

  const mobileLayer = showMobile ? (
    <AnnouncementBarLayer
      settings={settings}
      viewport="mobile"
      preview={preview}
      resolveHref={resolveHref}
      className={`w-full ${showDesktop ? 'md:hidden' : ''}`}
    />
  ) : null;

  if (!desktopLayer && !mobileLayer) return null;
  return (
    <>
      {desktopLayer}
      {mobileLayer}
    </>
  );
}
