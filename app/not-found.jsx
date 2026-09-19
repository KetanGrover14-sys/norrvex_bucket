import Link from 'next/link';
export default function NotFound() {
  return <div className="page-loading"><h1>Page not found</h1><Link href="/repository" className="primary">Go to repository</Link></div>;
}
