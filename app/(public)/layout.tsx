import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DownloadModal from "@/components/DownloadModal";
import { getCategories } from "@/lib/posts";

// Wraps every public page with the masthead and footer. The download modal
// stays mounted globally but its only trigger now lives in the per-article
// CTA at the bottom of article pages (not in the site chrome).
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();
  return (
    <>
      <SiteHeader categories={categories} />
      <main>{children}</main>
      <SiteFooter categories={categories} />
      <DownloadModal />
    </>
  );
}
