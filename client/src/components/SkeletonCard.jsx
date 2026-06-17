export default function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white p-4 rounded-xl shadow">
      <div className="h-32 bg-gray-300 rounded mb-3"></div>
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}
