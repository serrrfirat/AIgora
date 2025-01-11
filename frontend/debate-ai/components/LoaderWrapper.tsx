"use client";

import React, { useState, useEffect } from "react";
import Loader from "@/components/Loader";

export default function LoaderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2-second loading time
    return () => clearTimeout(timer);
  }, []);

  return <>{isLoading ? <Loader /> : children}</>;
}
