"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

type Result = {
  documentName: string;
  documentDescription: string;
  relevanceScore: number;
};

type SortKey = keyof Result;
type SortDirection = "asc" | "desc";

export function SearchResultsTable({ results }: { results: Result[] }) {
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({ key: "relevanceScore", direction: "desc" });

  const sortedResults = useMemo(() => {
    if (!results) return [];
    let sortableItems = [...results];
    sortableItems.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [results, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="rounded-md border">
        <Table>
          <TableHeader>
              <TableRow>
              <TableHead>
                  <Button variant="ghost" onClick={() => requestSort("documentName")} className="px-2">
                      Document
                      {getSortIndicator("documentName")}
                  </Button>
              </TableHead>
              <TableHead className="w-[150px] text-right">
                  <Button variant="ghost" onClick={() => requestSort("relevanceScore")} className="px-2">
                      Relevance
                      {getSortIndicator("relevanceScore")}
                  </Button>
              </TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {sortedResults.length > 0 ? (
                sortedResults.map((result, index) => (
                  <TableRow key={index}>
                      <TableCell>
                      <div className="font-medium">{result.documentName}</div>
                      <div className="text-sm text-muted-foreground">{result.documentDescription}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                          {(result.relevanceScore * 100).toFixed(1)}%
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
    </div>
  );
}
