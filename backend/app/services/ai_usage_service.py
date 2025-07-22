from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from fastapi import HTTPException, status
from app.models.ai_usage import AiUsageLog
from app.schemas.ai_usage import AiUsageLogCreate, AiUsageLogUpdate
from app.core.logging import logger
from datetime import datetime, timedelta
import json
import re


class AiUsageService:
    """Serviço para gerenciamento de logs de uso da IA."""
    
    @staticmethod
    def _sanitize_data(data: Any) -> Any:
        """Remove informações sensíveis dos dados."""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                # Lista de campos sensíveis para remover
                sensitive_fields = [
                    'password', 'senha', 'token', 'key', 'secret', 'cpf', 'cnpj',
                    'rg', 'passport', 'credit_card', 'cartao', 'account', 'conta'
                ]
                
                if any(field in key.lower() for field in sensitive_fields):
                    sanitized[key] = "[REDACTED]"
                elif isinstance(value, (dict, list)):
                    sanitized[key] = AiUsageService._sanitize_data(value)
                else:
                    sanitized[key] = value
            return sanitized
        elif isinstance(data, list):
            return [AiUsageService._sanitize_data(item) for item in data]
        else:
            return data
    
    @staticmethod
    def _sanitize_prompt(prompt: str) -> str:
        """Remove informações sensíveis do prompt."""
        if not prompt:
            return prompt
        
        # Padrões para remover informações sensíveis
        patterns = [
            (r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b', '[CPF]'),  # CPF
            (r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b', '[CNPJ]'),  # CNPJ
            (r'\b\d{1,2}\.\d{3}\.\d{3}-\d{1}\b', '[RG]'),  # RG
            (r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b', '[CARD]'),  # Cartão de crédito
            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),  # Email
            (r'\b\d{5}-?\d{3}\b', '[CEP]'),  # CEP
        ]
        
        sanitized_prompt = prompt
        for pattern, replacement in patterns:
            sanitized_prompt = re.sub(pattern, replacement, sanitized_prompt)
        
        return sanitized_prompt
    
    @staticmethod
    async def create_log(
        session: AsyncSession,
        log_data: AiUsageLogCreate
    ) -> AiUsageLog:
        """Cria um novo log de uso da IA."""
        try:
            # Sanitizar dados sensíveis
            prompt_sanitizado = AiUsageService._sanitize_prompt(log_data.prompt)
            dados_entrada_sanitizados = AiUsageService._sanitize_data(log_data.dados_entrada)
            resposta_sanitizada = AiUsageService._sanitize_data(log_data.resposta)
            
            log = AiUsageLog(
                tipo_operacao=log_data.tipo_operacao,
                operacao_id=log_data.operacao_id,
                prompt=prompt_sanitizado,
                dados_entrada=dados_entrada_sanitizados,
                resposta=resposta_sanitizada,
                modelo_utilizado=log_data.modelo_utilizado,
                tokens_entrada=log_data.tokens_entrada,
                tokens_saida=log_data.tokens_saida,
                custo_estimado=log_data.custo_estimado,
                tempo_resposta_ms=log_data.tempo_resposta_ms,
                status=log_data.status or "Concluído",
                erro=log_data.erro,
                metadados=log_data.metadados or {}
            )
            
            session.add(log)
            await session.commit()
            await session.refresh(log)
            
            logger.info(f"Log de uso da IA criado: {log.tipo_operacao} (ID: {log.id})")
            
            return log
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar log de uso da IA: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_log_by_id(session: AsyncSession, log_id: int) -> Optional[AiUsageLog]:
        """Busca log por ID."""
        try:
            result = await session.execute(
                select(AiUsageLog).where(AiUsageLog.id == log_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar log por ID {log_id}: {str(e)}")
            return None
    
    @staticmethod
    async def update_log(
        session: AsyncSession,
        log_id: int,
        log_data: AiUsageLogUpdate
    ) -> AiUsageLog:
        """Atualiza dados do log."""
        try:
            log = await AiUsageService.get_log_by_id(session, log_id)
            if not log:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Log não encontrado"
                )
            
            # Atualizar campos
            update_data = log_data.model_dump(exclude_unset=True)
            
            # Sanitizar dados se estão sendo atualizados
            if 'resposta' in update_data:
                update_data['resposta'] = AiUsageService._sanitize_data(update_data['resposta'])
            
            log.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(log)
            
            logger.info(f"Log de uso da IA atualizado: {log.id}")
            
            return log
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar log {log_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def list_logs(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        tipo_operacao: Optional[str] = None,
        modelo_utilizado: Optional[str] = None,
        status: Optional[str] = None,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None,
        min_tokens: Optional[int] = None,
        max_tokens: Optional[int] = None,
        min_custo: Optional[float] = None,
        max_custo: Optional[float] = None,
        search: Optional[str] = None
    ) -> tuple[List[AiUsageLog], int]:
        """Lista logs com filtros e paginação."""
        try:
            # Construir query base
            query = select(AiUsageLog)
            
            # Aplicar filtros
            conditions = []
            
            if tipo_operacao:
                conditions.append(AiUsageLog.tipo_operacao == tipo_operacao)
            
            if modelo_utilizado:
                conditions.append(AiUsageLog.modelo_utilizado == modelo_utilizado)
            
            if status:
                conditions.append(AiUsageLog.status == status)
            
            if data_inicio:
                conditions.append(AiUsageLog.created_at >= data_inicio)
            
            if data_fim:
                conditions.append(AiUsageLog.created_at <= data_fim)
            
            if min_tokens:
                conditions.append(AiUsageLog.total_tokens >= min_tokens)
            
            if max_tokens:
                conditions.append(AiUsageLog.total_tokens <= max_tokens)
            
            if min_custo:
                conditions.append(AiUsageLog.custo_estimado >= min_custo)
            
            if max_custo:
                conditions.append(AiUsageLog.custo_estimado <= max_custo)
            
            if search:
                search_term = f"%{search}%"
                conditions.append(
                    or_(
                        AiUsageLog.tipo_operacao.ilike(search_term),
                        AiUsageLog.modelo_utilizado.ilike(search_term),
                        AiUsageLog.prompt.ilike(search_term)
                    )
                )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Contar total
            count_query = select(func.count(AiUsageLog.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await session.execute(count_query)
            total = count_result.scalar()
            
            # Aplicar paginação e ordenação
            query = query.order_by(AiUsageLog.created_at.desc()).offset(skip).limit(limit)
            
            result = await session.execute(query)
            logs = result.scalars().all()
            
            return list(logs), total
            
        except Exception as e:
            logger.error(f"Erro ao listar logs: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_usage_stats(
        session: AsyncSession,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Obtém estatísticas de uso da IA."""
        try:
            # Definir período padrão (últimos 30 dias)
            if not data_inicio:
                data_inicio = datetime.now() - timedelta(days=30)
            if not data_fim:
                data_fim = datetime.now()
            
            # Filtro de período
            period_filter = and_(
                AiUsageLog.created_at >= data_inicio,
                AiUsageLog.created_at <= data_fim
            )
            
            # Total de operações
            total_result = await session.execute(
                select(func.count(AiUsageLog.id)).where(period_filter)
            )
            total_operacoes = total_result.scalar()
            
            # Total de tokens
            tokens_result = await session.execute(
                select(
                    func.sum(AiUsageLog.tokens_entrada),
                    func.sum(AiUsageLog.tokens_saida)
                ).where(period_filter)
            )
            tokens_entrada, tokens_saida = tokens_result.first()
            total_tokens = (tokens_entrada or 0) + (tokens_saida or 0)
            
            # Custo total
            custo_result = await session.execute(
                select(func.sum(AiUsageLog.custo_estimado)).where(period_filter)
            )
            custo_total = custo_result.scalar() or 0
            
            # Tempo médio de resposta
            tempo_result = await session.execute(
                select(func.avg(AiUsageLog.tempo_resposta_ms)).where(period_filter)
            )
            tempo_medio = tempo_result.scalar() or 0
            
            # Operações por tipo
            tipo_result = await session.execute(
                select(AiUsageLog.tipo_operacao, func.count(AiUsageLog.id))
                .where(period_filter)
                .group_by(AiUsageLog.tipo_operacao)
                .order_by(func.count(AiUsageLog.id).desc())
            )
            operacoes_por_tipo = dict(tipo_result.all())
            
            # Modelos utilizados
            modelo_result = await session.execute(
                select(AiUsageLog.modelo_utilizado, func.count(AiUsageLog.id))
                .where(period_filter)
                .group_by(AiUsageLog.modelo_utilizado)
                .order_by(func.count(AiUsageLog.id).desc())
            )
            modelos_utilizados = dict(modelo_result.all())
            
            # Status das operações
            status_result = await session.execute(
                select(AiUsageLog.status, func.count(AiUsageLog.id))
                .where(period_filter)
                .group_by(AiUsageLog.status)
            )
            operacoes_por_status = dict(status_result.all())
            
            # Uso por dia (últimos 30 dias)
            uso_por_dia_result = await session.execute(
                text("""
                    SELECT 
                        DATE_TRUNC('day', created_at) as dia,
                        COUNT(*) as operacoes,
                        SUM(tokens_entrada + tokens_saida) as tokens,
                        SUM(custo_estimado) as custo
                    FROM ai_usage_logs 
                    WHERE created_at >= :data_inicio AND created_at <= :data_fim
                    GROUP BY DATE_TRUNC('day', created_at)
                    ORDER BY dia DESC
                    LIMIT 30
                """).bindparams(data_inicio=data_inicio, data_fim=data_fim)
            )
            uso_por_dia = [
                {
                    "dia": str(dia),
                    "operacoes": operacoes,
                    "tokens": tokens or 0,
                    "custo": float(custo or 0)
                }
                for dia, operacoes, tokens, custo in uso_por_dia_result.all()
            ]
            
            return {
                "periodo": {
                    "inicio": data_inicio.isoformat(),
                    "fim": data_fim.isoformat()
                },
                "resumo": {
                    "total_operacoes": total_operacoes,
                    "total_tokens": total_tokens,
                    "tokens_entrada": tokens_entrada or 0,
                    "tokens_saida": tokens_saida or 0,
                    "custo_total": float(custo_total),
                    "tempo_medio_resposta_ms": float(tempo_medio)
                },
                "operacoes_por_tipo": operacoes_por_tipo,
                "modelos_utilizados": modelos_utilizados,
                "operacoes_por_status": operacoes_por_status,
                "uso_por_dia": uso_por_dia
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de uso: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_cost_analysis(
        session: AsyncSession,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Análise detalhada de custos."""
        try:
            # Definir período padrão (últimos 30 dias)
            if not data_inicio:
                data_inicio = datetime.now() - timedelta(days=30)
            if not data_fim:
                data_fim = datetime.now()
            
            period_filter = and_(
                AiUsageLog.created_at >= data_inicio,
                AiUsageLog.created_at <= data_fim
            )
            
            # Custo por tipo de operação
            custo_por_tipo_result = await session.execute(
                select(
                    AiUsageLog.tipo_operacao,
                    func.sum(AiUsageLog.custo_estimado),
                    func.count(AiUsageLog.id),
                    func.avg(AiUsageLog.custo_estimado)
                )
                .where(period_filter)
                .group_by(AiUsageLog.tipo_operacao)
                .order_by(func.sum(AiUsageLog.custo_estimado).desc())
            )
            
            custo_por_tipo = [
                {
                    "tipo_operacao": tipo,
                    "custo_total": float(custo_total or 0),
                    "total_operacoes": total_ops,
                    "custo_medio": float(custo_medio or 0)
                }
                for tipo, custo_total, total_ops, custo_medio in custo_por_tipo_result.all()
            ]
            
            # Custo por modelo
            custo_por_modelo_result = await session.execute(
                select(
                    AiUsageLog.modelo_utilizado,
                    func.sum(AiUsageLog.custo_estimado),
                    func.count(AiUsageLog.id)
                )
                .where(period_filter)
                .group_by(AiUsageLog.modelo_utilizado)
                .order_by(func.sum(AiUsageLog.custo_estimado).desc())
            )
            
            custo_por_modelo = [
                {
                    "modelo": modelo,
                    "custo_total": float(custo_total or 0),
                    "total_operacoes": total_ops
                }
                for modelo, custo_total, total_ops in custo_por_modelo_result.all()
            ]
            
            # Operações mais caras
            operacoes_caras_result = await session.execute(
                select(AiUsageLog)
                .where(period_filter)
                .order_by(AiUsageLog.custo_estimado.desc())
                .limit(10)
            )
            
            operacoes_caras = [
                {
                    "id": log.id,
                    "tipo_operacao": log.tipo_operacao,
                    "modelo": log.modelo_utilizado,
                    "custo": float(log.custo_estimado or 0),
                    "tokens": log.total_tokens,
                    "data": log.created_at.isoformat()
                }
                for log in operacoes_caras_result.scalars().all()
            ]
            
            return {
                "periodo": {
                    "inicio": data_inicio.isoformat(),
                    "fim": data_fim.isoformat()
                },
                "custo_por_tipo": custo_por_tipo,
                "custo_por_modelo": custo_por_modelo,
                "operacoes_mais_caras": operacoes_caras
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter análise de custos: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def cleanup_old_logs(
        session: AsyncSession,
        days_to_keep: int = 90
    ) -> int:
        """Remove logs antigos para economizar espaço."""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            # Contar logs a serem removidos
            count_result = await session.execute(
                select(func.count(AiUsageLog.id))
                .where(AiUsageLog.created_at < cutoff_date)
            )
            logs_to_delete = count_result.scalar()
            
            if logs_to_delete > 0:
                # Remover logs antigos
                await session.execute(
                    text("DELETE FROM ai_usage_logs WHERE created_at < :cutoff_date")
                    .bindparams(cutoff_date=cutoff_date)
                )
                await session.commit()
                
                logger.info(f"Removidos {logs_to_delete} logs antigos (anteriores a {cutoff_date})")
            
            return logs_to_delete
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao limpar logs antigos: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def export_logs(
        session: AsyncSession,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None,
        formato: str = "json"
    ) -> Dict[str, Any]:
        """Exporta logs para análise externa."""
        try:
            # Definir período padrão (últimos 30 dias)
            if not data_inicio:
                data_inicio = datetime.now() - timedelta(days=30)
            if not data_fim:
                data_fim = datetime.now()
            
            period_filter = and_(
                AiUsageLog.created_at >= data_inicio,
                AiUsageLog.created_at <= data_fim
            )
            
            result = await session.execute(
                select(AiUsageLog)
                .where(period_filter)
                .order_by(AiUsageLog.created_at.desc())
            )
            logs = result.scalars().all()
            
            export_data = {
                "metadata": {
                    "periodo_inicio": data_inicio.isoformat(),
                    "periodo_fim": data_fim.isoformat(),
                    "total_logs": len(logs),
                    "formato": formato,
                    "data_exportacao": datetime.now().isoformat()
                },
                "logs": [
                    {
                        "id": log.id,
                        "tipo_operacao": log.tipo_operacao,
                        "operacao_id": log.operacao_id,
                        "modelo_utilizado": log.modelo_utilizado,
                        "tokens_entrada": log.tokens_entrada,
                        "tokens_saida": log.tokens_saida,
                        "total_tokens": log.total_tokens,
                        "custo_estimado": float(log.custo_estimado or 0),
                        "tempo_resposta_ms": log.tempo_resposta_ms,
                        "status": log.status,
                        "created_at": log.created_at.isoformat(),
                        "metadados": log.metadados
                    }
                    for log in logs
                ]
            }
            
            logger.info(f"Exportados {len(logs)} logs do período {data_inicio} a {data_fim}")
            
            return export_data
            
        except Exception as e:
            logger.error(f"Erro ao exportar logs: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )