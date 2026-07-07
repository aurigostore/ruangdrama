export default function SkeletonGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="drama-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-text" style={{ marginTop: 8 }} />
          <div className="skeleton skeleton-text short" style={{ marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}
