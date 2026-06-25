export default function Loader() {
  return (
    <div className="flex justify-center items-center h-screen bg-[#f7f5f2]">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-emerald-200 border-t-emerald-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}