// Next.js re-mounts `template.tsx` (unlike layout.tsx) on every navigation
// within this route group, so this re-triggers the enter animation each time
// instead of only on first load - that's what makes page-to-page navigation
// feel like a soft transition rather than an instant content swap.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {children}
    </div>
  );
}
