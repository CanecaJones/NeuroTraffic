# Inteligência Artificial - NeuroTraffic

Este documento descreve o funcionamento da IA responsável pelo gerenciamento
do tráfego. Será atualizado conforme a IA for introduzida no projeto
(a partir da Etapa 9/10 do plano de desenvolvimento).

## Status Atual

Ainda não há IA implementada. Esta etapa (Etapa 1) cria apenas a estrutura
inicial do projeto.

## Objetivo da IA (planejado)

A IA deverá futuramente:

- Receber informações sobre o estado do trânsito (filas, veículos parados,
  tempo de espera, etc.).
- Tomar decisões sobre o controle dos semáforos.
- Ter como métricas de sucesso: redução do tempo médio de espera, redução
  de filas, aumento do número de veículos que atravessam o cruzamento, e
  ausência de colisões.
- Aprender e melhorar estratégias ao longo do tempo (ex: via Reinforcement
  Learning).

## Abordagem Planejada

1. Primeiro, implementar uma estratégia de controle baseada em regras
   simples (ex: tempo fixo ou baseado no tamanho da fila).
2. Depois, comparar essa estratégia com uma IA treinada, avaliando as
   métricas definidas acima.