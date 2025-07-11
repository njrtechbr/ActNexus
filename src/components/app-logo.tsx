import { BookCopy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BookCopy className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold tracking-tight text-primary font-headline">ActNexus</h1>
    </div>
  );
}
