"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Loader from "@/components/common/Loader";

export default function LoaderWrapper({
  children,
  minimumLoadTime = 1000,
  timeout = 10000,
}: {
  children: React.ReactNode;
  minimumLoadTime?: number;
  timeout?: number;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let minimumTimeoutId: NodeJS.Timeout;
    const startTime = Date.now();

    const handleComplete = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingMinimumTime = Math.max(0, minimumLoadTime - elapsedTime);

      // Ensure loader shows for at least minimumLoadTime
      minimumTimeoutId = setTimeout(() => {
        setIsLoading(false);
      }, remainingMinimumTime);
    };

    const trackResources = () => {
      // Track images
      const images = document.querySelectorAll("img");
      let loadedImages = 0;
      const totalImages = images.length;

      const imageLoaded = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          handleComplete();
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          imageLoaded();
        } else {
          img.addEventListener("load", imageLoaded);
          img.addEventListener("error", imageLoaded); // Count errors as loaded
        }
      });

      // If no images, complete immediately
      if (totalImages === 0) {
        handleComplete();
      }
    };

    const initialize = () => {
      setIsLoading(true);

      // Set maximum timeout
      timeoutId = setTimeout(() => {
        console.warn("Loading timeout reached, showing content anyway");
        setIsLoading(false);
      }, timeout);

      // Start tracking resources
      if (document.readyState === "complete") {
        trackResources();
      } else {
        window.addEventListener("load", trackResources);
      }
    };

    initialize();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(minimumTimeoutId);
      window.removeEventListener("load", trackResources);

      // Cleanup image listeners
      document.querySelectorAll("img").forEach((img) => {
        img.removeEventListener("load", () => {});
        img.removeEventListener("error", () => {});
      });
    };
  }, [pathname, minimumLoadTime, timeout]);

  return <>{isLoading ? <Loader /> : children}</>;
}
