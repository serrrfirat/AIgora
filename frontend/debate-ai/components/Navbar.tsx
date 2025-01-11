import { useState, useEffect } from "react";
import navbarImg from "../public/navbar.png";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu } from "lucide-react";

const Navbar = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleDrawer = () => {
    setDrawerOpen(!isDrawerOpen);
  };

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== "undefined") {
        if (window.scrollY > lastScrollY) {
          // if scroll down hide the navbar
          setIsVisible(false);
        } else {
          // if scroll up show the navbar
          setIsVisible(true);
        }

        // remember current page location to use in the next move
        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", controlNavbar);

      return () => {
        window.removeEventListener("scroll", controlNavbar);
      };
    }
  }, [lastScrollY]);

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div
          className="h-16 flex items-center justify-between px-4 sm:bg-no-repeat sm:bg-cover bg-gray-900 sm:bg-transparent"
          style={{ backgroundImage: `url(${navbarImg.src})` }}
        >
          {/* Logo and Hamburger Container */}
          <div className="flex items-center gap-2">
            <div className="text-white text-lg sm:text-2xl font-bold pixelated">
              AIgora
            </div>
            {/* Hamburger Menu (Visible on small screens) */}
            <div className="sm:hidden ml-2">
              <button
                className="text-white focus:outline-none"
                onClick={toggleDrawer}
              >
                <Menu className="w-8 h-8 font-bold" strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Navigation Buttons (Hidden on small screens) */}
          <div className="hidden sm:flex space-x-4 relative">
            <button className="text-white border-white border-2 bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-xs pixelated">
              Create Debate
            </button>
            <button className="text-white border-white border-2 bg-gray-800 px-2 py-2 rounded hover:bg-gray-700 text-xs pixelated">
              Active Debates
            </button>
            <button className="text-white border-white border-2 bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-xs pixelated">
              Gladiators
            </button>
          </div>

          {/* Wallet Connection Button */}
          <ConnectButton
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
          />
        </div>
      </div>

      {/* Spacer for fixed navbar */}
      <div className="h-16 mb-6" />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gray-800 shadow-lg transform ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 z-[60]`}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-white"
          onClick={toggleDrawer}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Drawer Content */}
        <div className="flex flex-col items-center mt-16 space-y-4">
          <button className="text-white bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-lg">
            Create Debate
          </button>
          <button className="text-white bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-lg">
            Active Debates
          </button>
          <button className="text-white bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-lg">
            Gladiators
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[55]"
          onClick={toggleDrawer}
        ></div>
      )}
    </>
  );
};

export default Navbar;
