import React from "react";

interface PixelCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function PixelCard({
  children,
  className = "",
}: PixelCardProps) {
  return (
    <div className={`pixel-corners--wrapper ${className}`}>
      <div className="pixel-corners bg-[#D2A679] p-5 text-[#2C2C2C]">
        {children}
      </div>
      <style jsx>{`
        .pixel-corners,
        .pixel-corners--wrapper {
          clip-path: polygon(
            0px calc(100% - 20px),
            4px calc(100% - 20px),
            4px calc(100% - 12px),
            8px calc(100% - 12px),
            8px calc(100% - 8px),
            12px calc(100% - 8px),
            12px calc(100% - 4px),
            20px calc(100% - 4px),
            20px 100%,
            calc(100% - 20px) 100%,
            calc(100% - 20px) calc(100% - 4px),
            calc(100% - 12px) calc(100% - 4px),
            calc(100% - 12px) calc(100% - 8px),
            calc(100% - 8px) calc(100% - 8px),
            calc(100% - 8px) calc(100% - 12px),
            calc(100% - 4px) calc(100% - 12px),
            calc(100% - 4px) calc(100% - 20px),
            100% calc(100% - 20px),
            100% 20px,
            calc(100% - 4px) 20px,
            calc(100% - 4px) 12px,
            calc(100% - 8px) 12px,
            calc(100% - 8px) 8px,
            calc(100% - 12px) 8px,
            calc(100% - 12px) 4px,
            calc(100% - 20px) 4px,
            calc(100% - 20px) 0px,
            20px 0px,
            20px 4px,
            12px 4px,
            12px 8px,
            8px 8px,
            8px 12px,
            4px 12px,
            4px 20px,
            0px 20px
          );
          position: relative;
        }
        .pixel-corners {
          border: 8px solid transparent;
        }
        .pixel-corners--wrapper {
          width: fit-content;
          height: fit-content;
        }
        .pixel-corners--wrapper .pixel-corners {
          display: block;
          clip-path: polygon(
            8px 24px,
            12px 24px,
            12px 16px,
            16px 16px,
            16px 12px,
            24px 12px,
            24px 8px,
            calc(100% - 24px) 8px,
            calc(100% - 24px) 12px,
            calc(100% - 16px) 12px,
            calc(100% - 16px) 16px,
            calc(100% - 12px) 16px,
            calc(100% - 12px) 24px,
            calc(100% - 8px) 24px,
            calc(100% - 8px) calc(100% - 24px),
            calc(100% - 12px) calc(100% - 24px),
            calc(100% - 12px) calc(100% - 16px),
            calc(100% - 16px) calc(100% - 16px),
            calc(100% - 16px) calc(100% - 12px),
            calc(100% - 24px) calc(100% - 12px),
            calc(100% - 24px) calc(100% - 8px),
            24px calc(100% - 8px),
            24px calc(100% - 12px),
            16px calc(100% - 12px),
            16px calc(100% - 16px),
            12px calc(100% - 16px),
            12px calc(100% - 24px),
            8px calc(100% - 24px)
          );
        }
        .pixel-corners::after,
        .pixel-corners--wrapper::after {
          content: "";
          position: absolute;
          clip-path: polygon(
            0px calc(100% - 20px),
            4px calc(100% - 20px),
            4px calc(100% - 12px),
            8px calc(100% - 12px),
            8px calc(100% - 8px),
            12px calc(100% - 8px),
            12px calc(100% - 4px),
            20px calc(100% - 4px),
            20px 100%,
            calc(100% - 20px) 100%,
            calc(100% - 20px) calc(100% - 4px),
            calc(100% - 12px) calc(100% - 4px),
            calc(100% - 12px) calc(100% - 8px),
            calc(100% - 8px) calc(100% - 8px),
            calc(100% - 8px) calc(100% - 12px),
            calc(100% - 4px) calc(100% - 12px),
            calc(100% - 4px) calc(100% - 20px),
            100% calc(100% - 20px),
            100% 20px,
            calc(100% - 4px) 20px,
            calc(100% - 4px) 12px,
            calc(100% - 8px) 12px,
            calc(100% - 8px) 8px,
            calc(100% - 12px) 8px,
            calc(100% - 12px) 4px,
            calc(100% - 20px) 4px,
            calc(100% - 20px) 0px,
            20px 0px,
            20px 4px,
            12px 4px,
            12px 8px,
            8px 8px,
            8px 12px,
            4px 12px,
            4px 20px,
            0px 20px,
            0px 50%,
            8px 50%,
            8px 24px,
            12px 24px,
            12px 16px,
            16px 16px,
            16px 12px,
            24px 12px,
            24px 8px,
            calc(100% - 24px) 8px,
            calc(100% - 24px) 12px,
            calc(100% - 16px) 12px,
            calc(100% - 16px) 16px,
            calc(100% - 12px) 16px,
            calc(100% - 12px) 24px,
            calc(100% - 8px) 24px,
            calc(100% - 8px) calc(100% - 24px),
            calc(100% - 12px) calc(100% - 24px),
            calc(100% - 12px) calc(100% - 16px),
            calc(100% - 16px) calc(100% - 16px),
            calc(100% - 16px) calc(100% - 12px),
            calc(100% - 24px) calc(100% - 12px),
            calc(100% - 24px) calc(100% - 8px),
            24px calc(100% - 8px),
            24px calc(100% - 12px),
            16px calc(100% - 12px),
            16px calc(100% - 16px),
            12px calc(100% - 16px),
            12px calc(100% - 24px),
            8px calc(100% - 24px),
            8px 50%,
            0px 50%
          );
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: #52362B;
          background
          display: block;
          pointer-events: none;
        }
        .pixel-corners::after {
          margin: -8px;
        }
      `}</style>
    </div>
  );
}
