/**
 * ClientShell.jsx — Responsive layout wrapper for the client/user-facing app
 *
 * Replaces the per-page `<main className="mx-auto ... max-w-[400px]">` pattern.
 *
 * Mobile (<lg):  Single column, max-w-[480px], bottom padding for nav pill
 * Desktop (≥lg): Flex layout with left sidebar offset, wider content area (max-w-5xl)
 *
 * Props:
 *   children     — page content
 *   activeTab    — current nav tab (passed through to ResponsiveNav)
 *   onTabChange  — tab change handler (passed through to ResponsiveNav)
 *   showNav      — whether to show nav (default true; set false for full-screen overlays)
 *   className    — additional classes for the content area
 *   noPadding    — skip default padding (for pages that manage their own)
 *   fullWidth    — skip max-width constraint on desktop (for pages needing full width)
 */
import ResponsiveNav from './ResponsiveNav'

function ClientShell({
  children,
  activeTab,
  onTabChange,
  showNav = true,
  className = '',
  noPadding = false,
  fullWidth = false,
}) {
  return (
    <div className="min-h-[100dvh] bg-[#f8f6f1]">
      {/* Responsive navigation */}
      {showNav ? (
        <ResponsiveNav activeTab={activeTab} onChange={onTabChange} />
      ) : null}

      {/* Main content area */}
      <main
        className={[
          'mx-auto flex flex-col w-full min-h-[100dvh]',
          // Mobile: narrow single column with bottom nav padding
          showNav ? 'pb-24 lg:pb-0' : '',
          // Mobile: constrained width
          fullWidth ? '' : 'max-w-[480px]',
          // Desktop: offset for sidebar, wider content
          showNav ? 'lg:ml-[240px] lg:w-[calc(100%-240px)]' : '',
          fullWidth ? '' : 'lg:max-w-5xl',
          // Default padding unless opted out
          noPadding ? '' : 'px-5 pt-3 lg:px-8 lg:pt-6',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>
    </div>
  )
}

export default ClientShell
