"use client";

import Loader from "@/components/Loader";
import Navbar from "./Navbar";

export default function NavbarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar /> {children}
    </>
  );
}
