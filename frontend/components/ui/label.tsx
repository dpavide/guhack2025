import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  hint?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, hint, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-1 block text-sm font-medium text-gray-700", className)}
      {...props}
    >
      <span className="flex items-center gap-2">
        {children}
        {hint && <span className="text-xs font-normal text-gray-400">{hint}</span>}
      </span>
    </label>
  )
);
Label.displayName = "Label";
