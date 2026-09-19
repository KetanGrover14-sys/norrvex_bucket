'use client';
export default function ErrorPage({ reset }) {
  return <div className="page-loading"><h1>Unable to open the workspace</h1><p>Please try again.</p><button className="primary" onClick={reset}>Retry</button></div>;
}
