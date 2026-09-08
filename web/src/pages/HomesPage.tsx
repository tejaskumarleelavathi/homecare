import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Home as HomeIcon,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  StickyNote,
  X,
} from "lucide-react";

import type { Home } from "@/types/home";
import { fetchHomes, ApiError } from "@/lib/api";
import { US_STATES, stateLabel } from "@/lib/us-states";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HomeFormDialog } from "@/components/homes/HomeFormDialog";

const ALL_STATES = "all";

function formatTimestamp(value: string) {
  if (!value) return "";
  const isoLike = value.includes("T")
    ? value
    : value.includes(" ")
    ? value.replace(" ", "T")
    : value;
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function HomesPage() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState(ALL_STATES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHome, setEditingHome] = useState<Home | null>(null);

  async function loadHomes() {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchHomes();
      setHomes(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the homecare API. Is the server running on port 4000?",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadHomes();
  }, []);

  const filteredHomes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return homes.filter((home) => {
      if (stateFilter !== ALL_STATES && home.state !== stateFilter) return false;
      if (!query) return true;
      return (
        String(home.home_id).includes(query) ||
        home.street.toLowerCase().includes(query) ||
        home.city.toLowerCase().includes(query) ||
        home.zip_code.toLowerCase().includes(query) ||
        (home.emails ?? "").toLowerCase().includes(query) ||
        (home.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [homes, search, stateFilter]);

  const hasActiveFilters = search.trim() !== "" || stateFilter !== ALL_STATES;

  function clearFilters() {
    setSearch("");
    setStateFilter(ALL_STATES);
  }

  function openAddDialog() {
    setEditingHome(null);
    setDialogOpen(true);
  }

  function openEditDialog(home: Home) {
    setEditingHome(home);
    setDialogOpen(true);
  }

  function handleSaved(home: Home) {
    setHomes((prev) => {
      const exists = prev.some((h) => h.home_id === home.home_id);
      return exists
        ? prev.map((h) => (h.home_id === home.home_id ? home : h))
        : [home, ...prev];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Homes</h1>
        <Button onClick={openAddDialog} disabled={isLoading || Boolean(loadError)}>
          <Plus className="size-4" />
          Add home
        </Button>
      </div>

      {loadError ? (
        <Card className="flex flex-col items-center gap-3 border border-destructive/40 px-6 py-16 text-center shadow-lg shadow-black/[0.08]">
          <div className="flex size-12 items-center justify-center rounded-full border border-destructive/40 text-destructive">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Couldn't load homes</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadHomes}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg shadow-black/[0.08]">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Home ID, address, email, notes…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATES}>All states</SelectItem>
                {US_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters}>
              <X className="size-3.5" />
              Clear filters
            </Button>
          </div>

          <Card className="py-0 shadow-lg shadow-black/[0.08]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading homes…"
                  : `${filteredHomes.length} of ${homes.length} home${homes.length === 1 ? "" : "s"}`}
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <p className="text-sm">Fetching homes from the database…</p>
              </div>
            ) : filteredHomes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full border border-border text-muted-foreground">
                  <SearchX className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">No homes match your filters</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting or clearing the filters above.
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Home ID</TableHead>
                      <TableHead>Street</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Zip</TableHead>
                      <TableHead>Emails</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHomes.map((home, index) => (
                      <TableRow key={home.home_id} className={cn(index % 2 === 1 && "bg-muted/40")}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <HomeIcon className="size-3.5 text-muted-foreground" />
                            {home.home_id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="size-3.5" />
                            <span className="text-foreground">{home.street}</span>
                          </span>
                        </TableCell>
                        <TableCell>{home.city}</TableCell>
                        <TableCell>
                          <Badge variant="outline" title={stateLabel(home.state)}>
                            {home.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{home.zip_code}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <span
                            className="inline-flex max-w-full items-center gap-1.5 text-muted-foreground"
                            title={home.emails || undefined}
                          >
                            <Mail className="size-3.5 shrink-0" />
                            <span className="truncate text-foreground">
                              {home.emails || "—"}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {home.notes ? (
                            <span
                              className="inline-flex max-w-full items-center gap-1.5 text-muted-foreground"
                              title={home.notes}
                            >
                              <StickyNote className="size-3.5 shrink-0" />
                              <span className="truncate text-foreground">{home.notes}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatTimestamp(home.created_at)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatTimestamp(home.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit home ${home.home_id}`}
                            onClick={() => openEditDialog(home)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      <HomeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        home={editingHome}
        onSaved={handleSaved}
      />
    </div>
  );
}
