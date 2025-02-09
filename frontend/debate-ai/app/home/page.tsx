"use client";

import { DebateList } from "../../components/home-page/DebateList";
import HomeCenter from "../../components/home-page/HomeCenter";
import Navbar from "../../components/common/Navbar";

export default function Home() {
  return (
    <>
      {/* <Navbar /> */}

      {/* home screen start */}
      <HomeCenter />

      {/* <div>
      </div> */}
      <DebateList />
    </>
  );
}
