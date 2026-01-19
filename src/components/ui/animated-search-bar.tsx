import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedSearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
}

export const AnimatedSearchBar = ({
  placeholder = "Pesquisar...",
  value: controlledValue,
  onChange,
  onSearch,
  className,
}: AnimatedSearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    if (!value) {
      setIsExpanded(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange("");
    } else {
      setInternalValue("");
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSearch) {
      onSearch(value);
    }
    if (e.key === "Escape") {
      handleCollapse();
    }
  };

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  return (
    <motion.div
      className={cn(
        "relative flex items-center",
        className
      )}
      initial={false}
      animate={{
        width: isExpanded ? "100%" : "auto",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <motion.div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-background/80 backdrop-blur-sm transition-all",
          isExpanded 
            ? "w-full px-4 py-2 shadow-md" 
            : "w-auto px-3 py-2 cursor-pointer hover:bg-muted/50"
        )}
        onClick={!isExpanded ? handleExpand : undefined}
      >
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        
        <AnimatePresence>
          {isExpanded && (
            <motion.input
              ref={inputRef}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              onBlur={handleCollapse}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          )}
        </AnimatePresence>

        {!isExpanded && (
          <span className="text-sm text-muted-foreground">Pesquisar</span>
        )}

        <AnimatePresence>
          {isExpanded && value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
