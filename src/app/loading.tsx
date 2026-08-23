import { Heart } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center animate-pulse">
          <Heart className="w-6 h-6 fill-white text-white" />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#3E6B5C] animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
