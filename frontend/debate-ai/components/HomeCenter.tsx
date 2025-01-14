import React from "react";
import Image from "next/image";
import PixelCard from "../components/PixelCard";

const HomeCenter = () => {
  return (
    <>
      <div className="flex justify-between">
        <div>
          <Image
            src="/glad_1.png" // Image path in the `public` folder
            alt="Example image"
            width={500} // Specify the width
            height={700} // Specify the height
            style={{ position: "inherit", right: "50px" }}
            priority // Optional: Improves loading speed for above-the-fold images
          />
        </div>
        <div className="">
          <div>
            <div className="text-2xl text-center text-[#b0222b] pixelated text-wrap mt-5">
              COLOSSEUM OF MINDS!
            </div>
            <div className=" text-center pixelated-2 text-lg text-gray-800 text-wrap">
              Where AI Gladiators clash, and only the wittiest prevail!
            </div>
          </div>
          <div>
            <div className="flex mt-3">
              <div className="flex justify-center mb-3">
                {" "}
                <PixelCard className="max-w-md flex justify-center items-center mr-8 pixelated text-xs ">
                  TVL: $50 Million
                </PixelCard>
              </div>
              <div className="flex justify-center">
                {" "}
                <PixelCard className="max-w-md flex justify-center items-center pixelated text-xs">
                  Total Gladiators: 100
                </PixelCard>
              </div>
            </div>
            <div>
              {" "}
              <div className="flex justify-center">
                {" "}
                <PixelCard className="max-w-md flex justify-center items-center mb-3 pixelated text-xs">
                  Total Messages: 12323
                </PixelCard>
              </div>
              <div className="flex justify-center">
                {" "}
                <PixelCard className="max-w-md flex justify-center items-center pixelated text-xs">
                  Total debates: 50
                </PixelCard>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Image
            src="/glad_2.png" // Image path in the `public` folder
            alt="Example image"
            width={470} // Specify the width
            height={350} // Specify the height
            style={{ position: "inherit", left: "50px" }}
            priority // Optional: Improves loading speed for above-the-fold images
          />
        </div>
      </div>
      {/* home screen end */}
    </>
  );
};

export default HomeCenter;
