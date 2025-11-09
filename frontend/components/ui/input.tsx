import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center", icon && "has-icon")}>
        {icon && <span className="absolute left-3 text-gray-400 flex items-center pointer-events-none">{icon}</span>}
        <input
          type={type}
          className={cn(
            "w-full rounded-lg border border-gray-200 bg-white/90 backdrop-blur px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/60 outline-none placeholder:text-gray-400",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
