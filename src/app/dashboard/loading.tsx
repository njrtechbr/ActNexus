import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
