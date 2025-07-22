from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.logging import logger
import httpx
import asyncio
from datetime import datetime
import json


class LangFlowService:
    """Serviço para integração com LangFlow."""
    
    def __init__(self):
        """Inicializa o serviço LangFlow."""
        self.base_url = settings.LANGFLOW_HOST
        self.timeout = 300  # 5 minutos para processamento de IA
        
        # IDs dos fluxos no LangFlow (devem ser configurados)
        self.flow_ids = {
            "process_pdf": settings.LANGFLOW_FLOW_PROCESS_PDF,
            "extract_act_details": settings.LANGFLOW_FLOW_EXTRACT_ACT,
            "search_acts": settings.LANGFLOW_FLOW_SEARCH_ACTS,
            "generate_summary": settings.LANGFLOW_FLOW_GENERATE_SUMMARY,
            "classify_document": settings.LANGFLOW_FLOW_CLASSIFY_DOC
        }
        
        logger.info(f"Serviço LangFlow inicializado - Base URL: {self.base_url}")
    
    async def _make_request(
        self,
        flow_id: str,
        inputs: Dict[str, Any],
        tweaks: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Faz uma requisição para o LangFlow."""
        try:
            url = f"{self.base_url}/api/v1/run/{flow_id}"
            
            payload = {
                "input_value": inputs.get("input_value", ""),
                "input_type": "chat",
                "output_type": "chat",
                "tweaks": tweaks or {}
            }
            
            # Adicionar inputs específicos
            if "inputs" in inputs:
                payload.update(inputs["inputs"])
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            # Adicionar autenticação se configurada
            if hasattr(settings, 'LANGFLOW_API_KEY') and settings.LANGFLOW_API_KEY:
                headers["Authorization"] = f"Bearer {settings.LANGFLOW_API_KEY}"
            
            logger.debug(f"Enviando requisição para LangFlow - Flow: {flow_id}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Resposta recebida do LangFlow - Flow: {flow_id}")
                    return result
                else:
                    error_msg = f"Erro na requisição LangFlow: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Erro no serviço de IA: {response.status_code}"
                    )
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout na requisição LangFlow - Flow: {flow_id}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Timeout no processamento de IA"
            )
        except httpx.RequestError as e:
            logger.error(f"Erro de conexão com LangFlow: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Serviço de IA indisponível"
            )
        except Exception as e:
            logger.error(f"Erro inesperado na requisição LangFlow: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno no processamento de IA"
            )
    
    async def process_pdf(
        self,
        pdf_url: str,
        livro_id: int,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Processa um PDF e extrai atos notariais."""
        try:
            flow_id = self.flow_ids["process_pdf"]
            
            inputs = {
                "input_value": f"Processar PDF do livro {livro_id}",
                "inputs": {
                    "pdf_url": pdf_url,
                    "livro_id": livro_id,
                    "context": additional_context or {}
                }
            }
            
            tweaks = {
                "extraction_mode": "detailed",
                "include_metadata": True,
                "parse_acts": True
            }
            
            logger.info(f"Iniciando processamento de PDF - Livro ID: {livro_id}")
            
            result = await self._make_request(flow_id, inputs, tweaks)
            
            # Processar resposta do LangFlow
            processed_result = self._process_pdf_response(result)
            
            logger.info(f"PDF processado com sucesso - Livro ID: {livro_id}")
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Erro no processamento de PDF - Livro ID: {livro_id}: {str(e)}")
            raise
    
    def _process_pdf_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Processa a resposta do LangFlow para extração de PDF."""
        try:
            # Extrair dados da resposta do LangFlow
            outputs = response.get("outputs", [])
            
            if not outputs:
                raise ValueError("Resposta do LangFlow não contém outputs")
            
            # Assumindo que o primeiro output contém os dados processados
            main_output = outputs[0]
            
            # Extrair metadados do livro
            livro_metadata = main_output.get("livro_metadata", {})
            
            # Extrair atos processados
            atos = main_output.get("atos", [])
            
            # Processar cada ato
            processed_atos = []
            for ato_data in atos:
                processed_ato = {
                    "numero": ato_data.get("numero"),
                    "tipo": ato_data.get("tipo"),
                    "data_ato": ato_data.get("data_ato"),
                    "conteudo_original": ato_data.get("conteudo_original", ""),
                    "conteudo_markdown": ato_data.get("conteudo_markdown", ""),
                    "partes": ato_data.get("partes", []),
                    "observacoes": ato_data.get("observacoes", ""),
                    "status_ia": "processado",
                    "confianca_ia": ato_data.get("confidence", 0.0)
                }
                processed_atos.append(processed_ato)
            
            return {
                "livro_metadata": livro_metadata,
                "atos": processed_atos,
                "processing_stats": {
                    "total_atos": len(processed_atos),
                    "processing_time": main_output.get("processing_time", 0),
                    "confidence_avg": sum(ato.get("confianca_ia", 0) for ato in processed_atos) / len(processed_atos) if processed_atos else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar resposta do LangFlow: {str(e)}")
            raise ValueError(f"Erro ao interpretar resposta da IA: {str(e)}")
    
    async def extract_act_details(
        self,
        ato_content: str,
        ato_id: int,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Extrai detalhes específicos de um ato."""
        try:
            flow_id = self.flow_ids["extract_act_details"]
            
            inputs = {
                "input_value": f"Extrair detalhes do ato {ato_id}",
                "inputs": {
                    "ato_content": ato_content,
                    "ato_id": ato_id,
                    "context": context or {}
                }
            }
            
            tweaks = {
                "detail_level": "comprehensive",
                "extract_parties": True,
                "extract_dates": True,
                "extract_values": True
            }
            
            logger.info(f"Extraindo detalhes do ato - ID: {ato_id}")
            
            result = await self._make_request(flow_id, inputs, tweaks)
            
            # Processar resposta
            processed_result = self._process_act_details_response(result)
            
            logger.info(f"Detalhes extraídos com sucesso - Ato ID: {ato_id}")
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Erro na extração de detalhes - Ato ID: {ato_id}: {str(e)}")
            raise
    
    def _process_act_details_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Processa a resposta do LangFlow para extração de detalhes."""
        try:
            outputs = response.get("outputs", [])
            
            if not outputs:
                raise ValueError("Resposta do LangFlow não contém outputs")
            
            main_output = outputs[0]
            
            return {
                "partes": main_output.get("partes", []),
                "datas_importantes": main_output.get("datas", []),
                "valores": main_output.get("valores", []),
                "observacoes_ia": main_output.get("observacoes", ""),
                "confianca": main_output.get("confidence", 0.0),
                "tags": main_output.get("tags", []),
                "resumo": main_output.get("resumo", "")
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar resposta de detalhes: {str(e)}")
            raise ValueError(f"Erro ao interpretar detalhes da IA: {str(e)}")
    
    async def search_acts(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Busca atos usando IA semântica."""
        try:
            flow_id = self.flow_ids["search_acts"]
            
            inputs = {
                "input_value": query,
                "inputs": {
                    "search_query": query,
                    "filters": filters or {},
                    "limit": limit
                }
            }
            
            tweaks = {
                "search_mode": "semantic",
                "include_similarity": True,
                "min_similarity": 0.7
            }
            
            logger.info(f"Buscando atos com IA - Query: {query[:50]}...")
            
            result = await self._make_request(flow_id, inputs, tweaks)
            
            # Processar resposta
            processed_result = self._process_search_response(result)
            
            logger.info(f"Busca concluída - {len(processed_result.get('results', []))} resultados")
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Erro na busca de atos: {str(e)}")
            raise
    
    def _process_search_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Processa a resposta do LangFlow para busca."""
        try:
            outputs = response.get("outputs", [])
            
            if not outputs:
                return {"results": [], "total": 0}
            
            main_output = outputs[0]
            
            results = main_output.get("results", [])
            
            processed_results = []
            for result in results:
                processed_results.append({
                    "ato_id": result.get("ato_id"),
                    "livro_id": result.get("livro_id"),
                    "numero": result.get("numero"),
                    "tipo": result.get("tipo"),
                    "similarity_score": result.get("similarity", 0.0),
                    "excerpt": result.get("excerpt", ""),
                    "highlight": result.get("highlight", "")
                })
            
            return {
                "results": processed_results,
                "total": len(processed_results),
                "query": main_output.get("original_query", ""),
                "processing_time": main_output.get("processing_time", 0)
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar resposta de busca: {str(e)}")
            raise ValueError(f"Erro ao interpretar resultados da busca: {str(e)}")
    
    async def generate_summary(
        self,
        content: str,
        summary_type: str = "brief",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Gera resumo de conteúdo usando IA."""
        try:
            flow_id = self.flow_ids["generate_summary"]
            
            inputs = {
                "input_value": content,
                "inputs": {
                    "content": content,
                    "summary_type": summary_type,
                    "context": context or {}
                }
            }
            
            tweaks = {
                "max_length": 500 if summary_type == "brief" else 1000,
                "include_keywords": True,
                "language": "pt-br"
            }
            
            logger.info(f"Gerando resumo - Tipo: {summary_type}")
            
            result = await self._make_request(flow_id, inputs, tweaks)
            
            # Processar resposta
            processed_result = self._process_summary_response(result)
            
            logger.info("Resumo gerado com sucesso")
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Erro na geração de resumo: {str(e)}")
            raise
    
    def _process_summary_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Processa a resposta do LangFlow para geração de resumo."""
        try:
            outputs = response.get("outputs", [])
            
            if not outputs:
                raise ValueError("Resposta do LangFlow não contém outputs")
            
            main_output = outputs[0]
            
            return {
                "summary": main_output.get("summary", ""),
                "keywords": main_output.get("keywords", []),
                "confidence": main_output.get("confidence", 0.0),
                "word_count": main_output.get("word_count", 0),
                "processing_time": main_output.get("processing_time", 0)
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar resposta de resumo: {str(e)}")
            raise ValueError(f"Erro ao interpretar resumo da IA: {str(e)}")
    
    async def classify_document(
        self,
        content: str,
        document_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Classifica um documento usando IA."""
        try:
            flow_id = self.flow_ids["classify_document"]
            
            inputs = {
                "input_value": content,
                "inputs": {
                    "content": content,
                    "hint_type": document_type
                }
            }
            
            tweaks = {
                "classification_mode": "detailed",
                "include_confidence": True,
                "extract_entities": True
            }
            
            logger.info("Classificando documento com IA")
            
            result = await self._make_request(flow_id, inputs, tweaks)
            
            # Processar resposta
            processed_result = self._process_classification_response(result)
            
            logger.info(f"Documento classificado como: {processed_result.get('classification')}")
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Erro na classificação de documento: {str(e)}")
            raise
    
    def _process_classification_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Processa a resposta do LangFlow para classificação."""
        try:
            outputs = response.get("outputs", [])
            
            if not outputs:
                raise ValueError("Resposta do LangFlow não contém outputs")
            
            main_output = outputs[0]
            
            return {
                "classification": main_output.get("classification", "unknown"),
                "confidence": main_output.get("confidence", 0.0),
                "entities": main_output.get("entities", []),
                "categories": main_output.get("categories", []),
                "reasoning": main_output.get("reasoning", "")
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar resposta de classificação: {str(e)}")
            raise ValueError(f"Erro ao interpretar classificação da IA: {str(e)}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Verifica a saúde do serviço LangFlow."""
        try:
            url = f"{self.base_url}/health"
            
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    return {
                        "status": "healthy",
                        "langflow_version": response.json().get("version", "unknown"),
                        "response_time": response.elapsed.total_seconds()
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "error": f"HTTP {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Erro no health check do LangFlow: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# Instância global do serviço LangFlow
langflow_service = LangFlowService()