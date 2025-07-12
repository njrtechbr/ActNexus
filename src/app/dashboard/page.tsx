
"use client";

import { useState, useEffect, useMemo } from "react";
import { Book, FileText, Users, FileCheck2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ConversationalAgent } from "@/components/dashboard/conversational-agent";
import { getLivros, getAtosByLivroId, getClientes, type Livro, type Ato, type Cliente } from "@/services/apiClientLocal";
import { populateInitialData } from "@/data/initial-data";
import Loading from "./loading";
import { AtosPorMesChart } from "@/components/dashboard/atos-por-mes-chart";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    livros: 0,
    atos: 0,
    clientes: 0,
    atosValidados: 0,
  });
  const [atos, setAtos] = useState<Ato[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    populateInitialData();

    async function loadStats() {
      try {
        const [livrosData, clientesData] = await Promise.all([
          getLivros(),
          getClientes(),
        ]);

        let totalAtos = 0;
        let atosValidados = 0;
        const todosAtos: Ato[] = [];

        for (const livro of livrosData) {
            const atosDoLivro = await getAtosByLivroId(livro.id);
            todosAtos.push(...atosDoLivro);
            totalAtos += atosDoLivro.length;
            atosValidados += atosDoLivro.filter(ato => ato.dadosExtraidos).length;
        }

        setAtos(todosAtos);
        setStats({
          livros: livrosData.length,
          atos: totalAtos,
          clientes: clientesData.length,
          atosValidados: atosValidados
        });
      } catch (error) {
        console.error("Falha ao carregar estatísticas do dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const chartData = useMemo(() => {
    if (!atos.length) return [];
    
    const data: { [key: string]: { month: string, total: number } } = {};

    atos.forEach(ato => {
      const date = new Date(ato.dataAto);
      const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (!data[month]) {
        data[month] = { month, total: 0 };
      }
      data[month].total += 1;
    });

    const sortedData = Object.values(data).sort((a,b) => {
        const [monthA, yearA] = a.month.split(' ');
        const [monthB, yearB] = b.month.split(' ');
        const dateA = new Date(`${monthA} 1, 20${yearA}`);
        const dateB = new Date(`${monthB} 1, 20${yearB}`);
        return dateA.getTime() - dateB.getTime();
    });

    return sortedData;
  }, [atos]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground">
          Uma visão geral de suas atividades notariais.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Livros Cadastrados"
          value={stats.livros.toString()}
          icon={Book}
          change={`${stats.atos} atos registrados`}
        />
        <MetricCard
          title="Atos Registrados"
          value={stats.atos.toString()}
          icon={FileText}
          change={`${stats.atosValidados} validados`}
        />
         <MetricCard
          title="Atos Validados"
          value={stats.atosValidados.toString()}
          icon={FileCheck2}
          change={`${( (stats.atos > 0 ? stats.atosValidados / stats.atos : 0) * 100).toFixed(0)}% do total`}
        />
        <MetricCard
          title="Clientes Ativos"
          value={stats.clientes.toString()}
          icon={Users}
          change="Clientes na base"
        />
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
            <AtosPorMesChart data={chartData}/>
        </div>
        <div className="xl:col-span-1">
            <ConversationalAgent />
        </div>
      </div>
    </div>
  );
}
