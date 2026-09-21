import Link from 'next/link';
import Image from 'next/image';

export default function Brand({ compact = false }) {
  return <Link className={`brand brand-logo${compact ? ' brand-compact' : ''}`} href="/repository" aria-label="Norrvex Labs — Bucket home">
    <Image src="/images/norrvexlabs.png" width={219} height={159} alt="Norrvex Labs" className="norrvex-logo" unoptimized />
    {!compact && <span className="brand-sub">BUCKET</span>}
  </Link>;
}
