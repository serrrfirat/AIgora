"use client";

import React from "react";
import { CreateDebate } from "../../components/CreateDebate";
import Image from "next/image";

const CreateDebatePage = () => {
  return (
    <div className="min-h-screen w-full relative ">
      {/* Content container */}
      <div className="relative w-full max-w-7xl mx-auto px-4 py-6 min-h-screen flex items-start justify-center">
        {/* Left Image - Hidden on mobile */}
        <div className="hidden lg:block fixed left-0 bottom-0 pixelated-2 z-0">
          <Image
            src="/julius_with_a_gun.webp"
            alt="Julius Caesar Left"
            width={350}
            height={600}
            priority
            className="select-none"
          />
        </div>

        {/* Center Content - Full width on mobile, centered on desktop */}
        <div className="w-full lg:w-auto relative z-10">
          <CreateDebate />
        </div>

        {/* Right Image - Hidden on mobile */}
        <div className="hidden lg:block fixed right-0 bottom-0 z-0">
          <Image
            src="/julius_with_a_gun.webp"
            alt="Julius Caesar Right"
            width={350}
            height={600}
            style={{
              transform: "scaleX(-1)",
            }}
            priority
            className="select-none"
          />
        </div>
      </div>
    </div>
  );
};

export default CreateDebatePage;
