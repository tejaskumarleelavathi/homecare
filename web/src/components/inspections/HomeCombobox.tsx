import { useState } from "react";
import { Check, ChevronsUpDown, Home as HomeIcon, Search } from "lucide-react";

import type { Home } from "@/types/home";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HomeComboboxProps {
  homes: Home[];
  value: number | null;
  onChange: (homeId: number) => void;
  disabled?: boolean;
}

export function HomeCombobox({ homes, value, onChange, disabled }: HomeComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = homes.find((h) => h.home_id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full max-w-sm justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <HomeIcon className="size-4 shrink-0 text-muted-foreground" />
            {selected ? (
              <span className="truncate">
                HM-{selected.home_id} &middot; {selected.street}, {selected.city}
              </span>
            ) : (
              <span className="text-muted-foreground">Select a home&hellip;</span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder="Search by address, city, or Home ID…"
              className="border-0 px-0 focus-visible:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No homes match.</CommandEmpty>
            <CommandGroup>
              {homes.map((home) => (
                <CommandItem
                  key={home.home_id}
                  value={`${home.home_id} ${home.street} ${home.city} ${home.state} ${home.zip_code}`}
                  onSelect={() => {
                    onChange(home.home_id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      home.home_id === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">
                      HM-{home.home_id} &middot; {home.street}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {home.city}, {home.state} {home.zip_code}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
