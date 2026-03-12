export default function SplashScreen({ fadeOut }: { fadeOut: boolean }) {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black transition-opacity duration-1000 ease-in-out z-50 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
        Event<span className="text-yellow-500">Hive</span>
      </h1>
    </div>
  );
}