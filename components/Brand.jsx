import Link from 'next/link';

export default function Brand() {
  return <Link className="brand" href="/repository" aria-label="Norrvex Bucket home">
    <span className="brand-icon" aria-hidden="true">n<span>↗</span></span>
    <span>norrvex<span className="brand-sub">BUCKET</span></span>
  </Link>;
}
