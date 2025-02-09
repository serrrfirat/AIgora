import "../../app/globals.css";

function Loader() {
  return (
    <div className="min-h-screen bg-[#D1BB9E] flex items-center justify-center">
      <div className="relative">
        {/* Loader Container */}
        <div className="grid grid-cols-3 gap-1 p-4">
          {[...Array(9)].map((_, index) => (
            <div
              key={index}
              className="w-3 h-3 bg-[#52362B]"
              style={{
                animation: `pixelFade 1.5s infinite ${index * 0.15}s`,
                imageRendering: "pixelated",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Loader;
