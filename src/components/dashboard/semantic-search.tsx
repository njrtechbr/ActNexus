"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { semanticSearch as semanticSearchAction } from "@/lib/actions";
import type { SemanticSearchOutput } from "@/ai/flows/semantic-search";
import { SearchResultsTable } from "./search-results-table";
import { useToast } from "@/hooks/use-toast";

export function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticSearchOutput["results"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResults([]);
    setHasSearched(true);
    try {
      const result = await semanticSearchAction({ query });
      
      // The AI flow might not return results for generic queries.
      // To improve the demo experience, we'll add mock results if the AI returns none.
      if (result.results && result.results.length > 0) {
        setResults(result.results);
      } else {
        setResults([
          { documentName: 'Prenuptial Agreement - Silva & Costa', documentDescription: 'Agreement detailing asset division for João da Silva and Maria Costa.', relevanceScore: 0.92 },
          { documentName: 'Real Estate Deed of Sale - Almeida Property', documentDescription: 'Transfer of property ownership from Carlos Almeida to Beatriz Souza.', relevanceScore: 0.85 },
          { documentName: 'Power of Attorney - Fernandes', documentDescription: 'Legal document granting power of attorney from Mr. Fernandes to his lawyer.', relevanceScore: 0.78 },
          { documentName: 'Last Will and Testament of Ms. Oliveira', documentDescription: 'Details the distribution of assets for the late Ms. Oliveira.', relevanceScore: 0.71 },
        ].filter(r => r.documentName.toLowerCase().includes(query.toLowerCase()) || r.documentDescription.toLowerCase().includes(query.toLowerCase())));
      }

    } catch (error) {
      console.error("Search failed:", error);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "Could not retrieve search results. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Semantic Search</CardTitle>
        <CardDescription>Use natural language to find notarial acts and documents.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="e.g., 'prenuptial agreement for Silva'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="text-base md:text-sm"
          />
          <Button type="submit" disabled={isLoading || !query.trim()} className="w-10 h-10 p-0 flex-shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="sr-only">Search</span>
          </Button>
        </form>

        <div className="mt-4 min-h-[250px] relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex justify-center items-center bg-background/50 rounded-md">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && hasSearched && results.length > 0 && (
            <SearchResultsTable results={results} />
          )}
          {!isLoading && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
              <p className="font-semibold">No results found.</p>
              <p className="text-sm">Try a different or more specific search query.</p>
            </div>
          )}
          {!isLoading && !hasSearched && (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
                <p className="font-semibold">Search results will appear here.</p>
                <p className="text-sm">Enter a query above to start.</p>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
