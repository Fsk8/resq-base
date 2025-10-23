import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";

const queryClient = new QueryClient();

/**
 * Orden importante:
 * - QueryClientProvider debe envolver a cualquier componente/hook de thirdweb/react,
 *   porque thirdweb usa internamente TanStack Query.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>{children}</ThirdwebProvider>
    </QueryClientProvider>
  );
}
