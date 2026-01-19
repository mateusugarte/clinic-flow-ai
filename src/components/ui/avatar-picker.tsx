"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface AvatarOption {
  id: string;
  url: string;
  alt: string;
}

const defaultAvatars: AvatarOption[] = [
  { id: "1", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", alt: "Avatar 1" },
  { id: "2", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka", alt: "Avatar 2" },
  { id: "3", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", alt: "Avatar 3" },
  { id: "4", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max", alt: "Avatar 4" },
  { id: "5", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe", alt: "Avatar 5" },
  { id: "6", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver", alt: "Avatar 6" },
  { id: "7", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia", alt: "Avatar 7" },
  { id: "8", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack", alt: "Avatar 8" },
];

const pickerVariants = {
  container: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
};

interface AvatarPickerProps {
  avatars?: AvatarOption[];
  selectedId?: string;
  onSelect?: (avatar: AvatarOption) => void;
  className?: string;
}

export function AvatarPicker({
  avatars = defaultAvatars,
  selectedId,
  onSelect,
  className,
}: AvatarPickerProps) {
  const [internalSelected, setInternalSelected] = useState<string>(
    selectedId || avatars[0]?.id || ""
  );

  const selected = selectedId !== undefined ? selectedId : internalSelected;

  const handleSelect = (avatar: AvatarOption) => {
    setInternalSelected(avatar.id);
    onSelect?.(avatar);
  };

  const selectedAvatar = avatars.find((a) => a.id === selected);

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Main avatar display */}
      <motion.div
        key={selected}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-lg">
          {selectedAvatar && (
            <img
              src={selectedAvatar.url}
              alt={selectedAvatar.alt}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </motion.div>

      {/* Avatar selection grid */}
      <motion.div
        variants={pickerVariants.container}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-3"
      >
        {avatars.map((avatar) => (
          <motion.button
            key={avatar.id}
            onClick={() => handleSelect(avatar)}
            className={cn(
              "relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-200",
              selected === avatar.id
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
            variants={pickerVariants.item}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Select ${avatar.alt}`}
            aria-pressed={selected === avatar.id}
          >
            <img
              src={avatar.url}
              alt={avatar.alt}
              className="w-full h-full object-cover"
            />
            {selected === avatar.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 bg-primary/20 flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
