import React, { useRef, useState, useCallback } from "react";

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: "cyan" | "gold" | "emerald";
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = "",
  maxTilt = 12,
  glowColor = "cyan",
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [shineStyle, setShineStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setStyle({
        transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
          2
        )}deg) scale3d(1.02, 1.02, 1.02)`,
        transition: "transform 0.1s ease-out",
      });

      const glowRgba =
        glowColor === "gold"
          ? "rgba(245, 158, 11, 0.22)"
          : glowColor === "emerald"
          ? "rgba(16, 185, 129, 0.22)"
          : "rgba(6, 182, 212, 0.22)";

      setShineStyle({
        opacity: 1,
        background: `radial-gradient(circle at ${x}px ${y}px, ${glowRgba}, transparent 65%)`,
        transition: "opacity 0.2s ease-out",
      });
    },
    [maxTilt, glowColor]
  );

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
    });
    setShineStyle({
      opacity: 0,
      transition: "opacity 0.5s ease-out",
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`relative preserve-3d transition-shadow duration-300 ${className}`}
    >
      {/* Specular Light Shine Layer */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none z-20"
        style={shineStyle}
      />
      {children}
    </div>
  );
};
