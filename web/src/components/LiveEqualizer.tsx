import React from "react";

interface LiveEqualizerProps {
  color?: "cyan" | "gold" | "emerald";
  bars?: number;
  className?: string;
}

export const LiveEqualizer: React.FC<LiveEqualizerProps> = ({
  color = "cyan",
  bars = 5,
  className = "",
}) => {
  const bgClass =
    color === "gold"
      ? "bg-amber-400"
      : color === "emerald"
      ? "bg-emerald-400"
      : "bg-cyber-400";

  return (
    <div className={`flex items-end gap-1 h-5 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-0.5 rounded-full ${bgClass} ${
            i % 3 === 0
              ? "animate-bar-1"
              : i % 3 === 1
              ? "animate-bar-2"
              : "animate-bar-3"
          }`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
};
