import {
  FileText,
  FileCheck2,
  FileSearch2,
  FileClock,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SemanticSearch } from "@/components/dashboard/semantic-search";
import { PdfUpload } from "@/components/dashboard/pdf-upload";

export default function DashboardPage() {
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
          title="Documentos Enviados"
          value="1,234"
          icon={FileText}
          change="+20.1% do último mês"
        />
        <MetricCard
          title="Documentos Validados"
          value="1,050"
          icon={FileCheck2}
          change="+18.5% do último mês"
        />
        <MetricCard
          title="Validação Pendente"
          value="184"
          icon={FileClock}
          change="-5.2% do último mês"
        />
        <MetricCard
          title="Consultas de Pesquisa"
          value="573"
          icon={FileSearch2}
          change="+12 desde a última hora"
        />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SemanticSearch />
        </div>
        <div className="lg:col-span-2">
          <PdfUpload />
        </div>
      </div>
    </div>
  );
}
