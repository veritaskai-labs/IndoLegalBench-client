// Adds the DOM matchers (toBeInTheDocument, toHaveTextContent, ...) to expect.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when Vitest globals are on. We keep globals
// off and import explicitly, so unmount between tests has to be wired by hand.
afterEach(cleanup);
