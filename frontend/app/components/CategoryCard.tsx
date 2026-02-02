import { useEffect, useRef, useState } from "react";
import Image from "next/image";
type RawCategory = {
    category: string;
    count: number;
};

type CategoryUI = RawCategory & {
    color: string;
    percentage: number;
};

type CategoryCardProps = {
  item: CategoryUI;
  isVisible: boolean;
  type: "gmail" | "calendar";
};

export default function CategoryCard({ item, isVisible, type }: CategoryCardProps) {
  const [animatedCount, setAnimatedCount] = useState(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // 🔒 Daha önce animasyon çalıştıysa çık
    if (hasAnimatedRef.current) return;

    // 👀 Henüz görünür değilse çık
    if (!isVisible) return;

    hasAnimatedRef.current = true;

    let start: number | null = null;
    const duration = 700;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      setAnimatedCount(Math.floor(progress * item.count));
      setAnimatedPercentage(Math.floor(progress * item.percentage));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, item.count, item.percentage]);

  return (
    <div className="rounded-sm border p-4 bg-white">
      <div className="flex items-start gap-3">
        {/* ICON */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-md"
          style={{ backgroundColor: item.color }}
        >
          <Image
            src={`/icons/category/${item.category}.svg`}
            alt={item.category}
            width={17}
            height={17}
            className="invert brightness-0"
          />
        </div>

        <div className="flex-1">
          {/* TITLE */}
          <div className="text-md font-semibold mb-2 text-gray-800">
            {item.category}
          </div>

          {/* PERCENTAGE */}
          <div className="text-2xl font-semibold text-gray-900 mb-1">
            {animatedPercentage}%
          </div>

          {/* COUNT */}
          <div className="text-xs text-gray-500">
            {animatedCount}{" "}
            {type === "gmail" ? (animatedCount === 1 ? "email" : "emails") : (animatedCount === 1 ? "event" : "events")}
          </div>

          {/* PROGRESS BAR */}
          <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${animatedPercentage}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
