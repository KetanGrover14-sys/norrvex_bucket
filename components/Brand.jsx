import Link from 'next/link';
import Image from 'next/image';

export default function Brand({ compact = false }) {
  return <Link className={`brand brand-logo partnership-brand${compact ? ' brand-compact' : ''}`} href="/repository" aria-label="Apollo Pharmacy × Norrvex Labs — project portal">
    <div className="apollo-brand-primary">
      <Image src="/images/Apollo.png" width={6208} height={4568} sizes={compact ? '80px' : '(max-width: 720px) 120px, 190px'} alt="Apollo Hospitals logo" className="apollo-logo" />
      {!compact && <span className="apollo-brand-name">Apollo Pharmacy</span>}
    </div>
    <span className="brand-partner"><span className="brand-cross" aria-hidden="true">×</span><Image src="/images/norrvexlabs.png" width={219} height={159} alt="Norrvex Labs" className="norrvex-logo" unoptimized /></span>
  </Link>;
}
