import { redirect } from 'next/navigation';

export default function DiscoverEarnRedirectPage() {
  // Keep this simple and purely server-side.
  // Parsing searchParams here can trigger "sync dynamic APIs" errors in newer Next versions.
  redirect('/admin/discover-earn');
}

