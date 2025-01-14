import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";
import LoaderWrapper from "../components/LoaderWrapper";

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LoaderWrapper>{children}</LoaderWrapper>
        </Providers>
      </body>
    </html>
  );
}
export default RootLayout;
