import * as React from "react";
import { cn } from "@/lib/utils";

interface NumericInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: number | string;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
  decimalPlaces?: number;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, allowDecimals = false, decimalPlaces = 2, ...props }, ref) => {
    // Display value: show empty string for 0, otherwise show the number
    const displayValue = React.useMemo(() => {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (numValue === 0 || isNaN(numValue)) return "";
      if (allowDecimals) {
        return numValue.toString();
      }
      return Math.floor(numValue).toString();
    }, [value, allowDecimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input (treat as 0)
      if (inputValue === "") {
        onChange(0);
        return;
      }

      // Remove leading zeros (except for decimals like "0.5")
      let cleanValue = inputValue;
      if (allowDecimals) {
        // Allow decimal input
        cleanValue = inputValue.replace(/^0+(?=\d)/, "");
        const parsed = parseFloat(cleanValue);
        if (!isNaN(parsed)) {
          onChange(parsed);
        }
      } else {
        // Integer only - remove all non-digits and leading zeros
        cleanValue = inputValue.replace(/\D/g, "").replace(/^0+/, "");
        const parsed = parseInt(cleanValue, 10);
        onChange(isNaN(parsed) ? 0 : parsed);
      }
    };

    return (
      <input
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder="0"
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
