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
      setResults(result.results || []);
    } catch (error) {
      console.error("A pesquisa falhou:", error);
      toast({
        variant: "destructive",
        title: "Falha na Pesquisa",
        description: "Não foi possível obter os resultados da pesquisa. Por favor, tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Pesquisa Semântica</CardTitle>
        <CardDescription>Use linguagem natural para encontrar atos e documentos notariais.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="ex: 'acordo pré-nupcial para Silva'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="text-base md:text-sm"
          />
          <Button type="submit" disabled={isLoading || !query.trim()} className="w-10 h-10 p-0 flex-shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="sr-only">Pesquisar</span>
          </Button>
        </form>

        <div className="mt-4 flex-1 relative min-h-[150px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex justify-center items-center bg-background/50 rounded-md">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && hasSearched && results.length > 0 && (
            <SearchResultsTable results={results} />
          )}
          {!isLoading && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
              <p className="font-semibold">Nenhum resultado encontrado.</p>
              <p className="text-sm">Tente uma consulta de pesquisa diferente ou mais específica.</p>
            </div>
          )}
          {!isLoading && !hasSearched && (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <p className="font-semibold">Os resultados da pesquisa aparecerão aqui.</p>
                <p className="text-sm">Digite uma consulta acima para começar.</p>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
