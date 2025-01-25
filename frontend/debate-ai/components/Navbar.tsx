import { useState, useEffect } from "react";
import navbarImg from "../public/navbar.png";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, ExternalLink, Menu, Wallet } from "lucide-react";

const Navbar = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleDrawer = () => {
    setDrawerOpen(!isDrawerOpen);
  };

  const handleGladiatorsClick = () => {
    window.location.href = `/gladiators`;
  };

  const handleDebatesClick = () => {
    window.location.href = `/create-debate`;
  };

  const handleCreateGladiatorsClick = () => {
    window.location.href = `/create-gladiator`;
  };

  const handleHomeClick = () => {
    window.location.href = `/`;
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
      <div className={`fixed top-0 left-0 right-0 z-50 `}>
        <div
          className="h-16 flex items-center justify-between px-4 sm:bg-no-repeat sm:bg-cover bg-gray-900 sm:bg-transparent"
          style={{ backgroundImage: `url(${navbarImg.src})` }}
        >
          {/* Logo and Hamburger Container */}
          <div className="flex-1 items-center gap-2">
            <div
              className="text-white text-lg sm:text-2xl font-bold pixelated cursor-pointer"
              onClick={() => handleHomeClick()}
            >
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
          <div className="hidden sm:flex space-x-4 relative flex-1 justify-center px-4 w-full ">
            <button
              className="text-white border-white border-2 bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-[10px] pixelated"
              onClick={() => handleDebatesClick()}
            >
              Create Debate
            </button>
            {/* <button className="text-white border-white border-2 bg-gray-800 px-2 py-2 rounded hover:bg-gray-700 text-xs pixelated">
              Active Debates
            </button> */}
            <button
              className="text-white border-white border-2 bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-[10px] pixelated"
              onClick={() => handleGladiatorsClick()}
            >
              Gladiators
            </button>
            <button
              className="text-white border-white border-2 bg-gray-800  rounded hover:bg-gray-700 text-[10px] pixelated"
              onClick={() => handleCreateGladiatorsClick()}
            >
              Create Gladiator
            </button>
          </div>

          {/* Wallet Connection Button */}
          <div className="flex-1 flex justify-end ">
            {/* <ConnectButton
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            /> */}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== "loading";
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === "authenticated");

                return (
                  <div
                    {...(!ready && {
                      "aria-hidden": true,
                      style: {
                        opacity: 0,
                        pointerEvents: "none",
                        userSelect: "none",
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className=" pixelated-2 relative group px-2 sm:px-6 py-2 rounded-xl bg-gradient-to-b from-[#F5E6E0] to-[#E5D5CF] hover:from-[#E5D5CF] hover:to-[#D5C5BF] text-[#52362B] font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <div className="flex items-center gap-2">
                              <Wallet className="w-5 h-5" />
                              <span className="hidden sm:inline">
                                Connect Wallet
                              </span>
                            </div>
                            <div className="absolute inset-0 rounded-xl border border-[#52362B]/10 group-hover:border-[#52362B]/20" />
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-2 sm:px-6 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold transition-all duration-200 shadow hover:shadow-md flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              Wrong Network
                            </span>
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2 pixelated-2 ">
                          {/* Network Button */}
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-2 sm:px-4 py-2 rounded-xl bg-[#F5E6E0] hover:bg-[#E5D5CF] text-[#52362B] font-medium transition-all duration-200 flex items-center gap-2 border border-[#52362B]/10"
                          >
                            {chain.hasIcon && (
                              <div className="w-5 h-5 rounded-full overflow-hidden border border-[#52362B]/10 bg-white flex-shrink-0">
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? "Chain icon"}
                                    src={chain.iconUrl}
                                    className="w-full h-full object-contain"
                                  />
                                )}
                              </div>
                            )}
                            <span className="hidden sm:inline">
                              {chain.name}
                            </span>
                          </button>

                          {/* Account Button - Simplified for mobile */}
                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="group px-2 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-[#F5E6E0] to-[#E5D5CF] hover:from-[#E5D5CF] hover:to-[#D5C5BF] text-[#52362B] font-medium transition-all duration-200 relative"
                          >
                            <div className="flex items-center gap-2">
                              {/* Mobile View - Just the first 4 and last 4 characters */}
                              <span className="sm:hidden">
                                {`${account.displayName.slice(
                                  0,
                                  4
                                )}...${account.displayName.slice(-4)}`}
                              </span>

                              {/* Desktop View - Full address and chevron */}
                              <div className="hidden sm:flex items-center gap-2">
                                <span>{account.displayName}</span>
                                <ChevronDown className="w-4 h-4 opacity-60" />
                              </div>
                            </div>
                            <div className="absolute inset-0 rounded-xl border border-[#52362B]/10 group-hover:border-[#52362B]/20" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
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
          <button
            className="text-white bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-lg"
            onClick={() => handleDebatesClick()}
          >
            Create Debate
          </button>
          <button
            className="text-white bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-lg"
            onClick={() => handleCreateGladiatorsClick()}
          >
            Create Gladiator
          </button>
          <button
            className="text-white bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-lg"
            onClick={() => handleGladiatorsClick()}
          >
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
