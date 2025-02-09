import { useState, useEffect } from "react";
import navbarImg from "../public/navbar.png";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  ChevronDown,
  ExternalLink,
  Menu,
  Wallet,
  X,
  Swords,
  Users,
  PlusCircle,
} from "lucide-react";

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
        <div className="h-16 flex items-center justify-between px-4 sm:bg-no-repeat bg-[#2a1b15] sm:bg-cover  sm:bg-transparent navbar">
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
                        <div className="flex items-center gap-2 pixelated-2">
                          {/* Network Button */}
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-2 sm:px-4 py-2 rounded-xl bg-[#F5E6E0] hover:bg-[#E5D6CF] text-[#52362B] font-medium transition-all duration-200 flex items-center gap-2 border border-[#52362B]/10"
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
                            <span className="hidden lg:inline">
                              {chain.name}
                            </span>
                          </button>

                          {/* Account Button */}
                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="group px-2 py-2 rounded-xl bg-gradient-to-b from-[#F5E6E0] to-[#E5D6CF] hover:from-[#E5D6CF] hover:to-[#D5C5BF] text-[#52362B] font-medium transition-all duration-200 relative"
                          >
                            <div className="flex items-center gap-2">
                              <span className="lg:hidden">
                                {`${account.displayName.slice(
                                  0,
                                  4
                                )}...${account.displayName.slice(-4)}`}
                              </span>
                              <div className="hidden lg:flex items-center gap-2">
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

      {/* Enhanced Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-[#52362B] to-[#2A1B15] shadow-2xl transform ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        } transition-all duration-300 ease-in-out z-[60] border-l border-[#D1BB9E]/20`}
      >
        {/* Drawer Header */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-[#2A1B15]/50 backdrop-blur-sm border-b border-[#D1BB9E]/20 px-6 flex items-center justify-between">
          <h2 className="text-[#FFD700] font-semibold text-xl">Menu</h2>
          <button
            className="w-8 h-8 rounded-full bg-[#52362B] hover:bg-[#3B2820] transition-colors flex items-center justify-center text-[#FAF9F6] border border-[#D1BB9E]/20"
            onClick={toggleDrawer}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex flex-col px-6 pt-32 space-y-3">
          <button
            className="group flex items-center gap-3 w-full p-4 rounded-lg bg-[#3B2820] hover:bg-[#52362B] border border-[#D1BB9E]/20 transition-all hover:shadow-lg"
            onClick={() => handleDebatesClick()}
          >
            <div className="w-10 h-10 rounded-full bg-[#2A1B15] flex items-center justify-center border border-[#D1BB9E]/20 group-hover:border-[#D1BB9E]/40 transition-colors">
              <PlusCircle className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#FFD700] font-medium">Create Debate</span>
              <span className="text-sm text-[#D1BB9E]/60">
                Start a new debate
              </span>
            </div>
          </button>

          <button
            className="group flex items-center gap-3 w-full p-4 rounded-lg bg-[#3B2820] hover:bg-[#52362B] border border-[#D1BB9E]/20 transition-all hover:shadow-lg"
            onClick={() => handleCreateGladiatorsClick()}
          >
            <div className="w-10 h-10 rounded-full bg-[#2A1B15] flex items-center justify-center border border-[#D1BB9E]/20 group-hover:border-[#D1BB9E]/40 transition-colors">
              <Swords className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#FFD700] font-medium">
                Create Gladiator
              </span>
              <span className="text-sm text-[#D1BB9E]/60">New challenger</span>
            </div>
          </button>

          <button
            className="group flex items-center gap-3 w-full p-4 rounded-lg bg-[#3B2820] hover:bg-[#52362B] border border-[#D1BB9E]/20 transition-all hover:shadow-lg"
            onClick={() => handleGladiatorsClick()}
          >
            <div className="w-10 h-10 rounded-full bg-[#2A1B15] flex items-center justify-center border border-[#D1BB9E]/20 group-hover:border-[#D1BB9E]/40 transition-colors">
              <Users className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#FFD700] font-medium">Gladiators</span>
              <span className="text-sm text-[#D1BB9E]/60">
                View all fighters
              </span>
            </div>
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
