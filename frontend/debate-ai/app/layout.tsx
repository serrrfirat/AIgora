import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";
import LoaderWrapper from "../components/LoaderWrapper";
import NavbarWrapper from "../components/NavbarWrapper";

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="custom-scrollbar-main ">
        <Providers>
          <LoaderWrapper>
            <NavbarWrapper>{children}</NavbarWrapper>
          </LoaderWrapper>
        </Providers>
      </body>
    </html>
  );
}
export default RootLayout;
