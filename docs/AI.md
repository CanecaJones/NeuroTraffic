# Inteligência Artificial - NeuroTraffic

Este documento descreve o funcionamento da IA responsável pelo gerenciamento
do tráfego. Será atualizado conforme a IA for introduzida no projeto
(a partir da Etapa 9/10 do plano de desenvolvimento).

## Status Atual

O controle dos semáforos (Etapa 9) agora usa um **algoritmo baseado em
regras fixas**, e não mais um ciclo de tempo fixo simples: a duração do
verde de cada grupo (leste-oeste / norte-sul) varia entre um mínimo e um
máximo, dependendo do tamanho da fila de cada lado. Ainda assim, isso
**não é Inteligência Artificial** — não há aprendizado, apenas regras
escritas manualmente (`if/else`). Esse algoritmo serve como **baseline**:
mais adiante, quando a IA real for implementada (Etapa 10), poderemos
comparar as métricas (tempo médio de espera, fila, throughput) entre essa
heurística e a IA treinada.

### Regras atuais do algoritmo baseado em regras

- Verde mínimo de 3 segundos, mesmo que a fila oposta esteja maior.
- Verde máximo de 10 segundos, mesmo que ainda haja fila no grupo atual.
- Entre o mínimo e o máximo, o sinal troca para amarelo se:
  - a fila do grupo atual chegar a zero; ou
  - a fila do grupo oposto for pelo menos 2 carros maior que a do grupo atual.
- Após o amarelo (2s), há 1 segundo de "tudo vermelho" antes do outro
  grupo abrir, por segurança.

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