"use client";

import { DebateList } from "../../components/DebateList";
import HomeCenter from "../../components/HomeCenter";
import Navbar from "../../components/Navbar";

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
