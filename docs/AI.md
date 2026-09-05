# Inteligência Artificial - NeuroTraffic

Este documento descreve o funcionamento da IA responsável pelo gerenciamento
do tráfego, e evolui junto com o projeto.

## Status Atual (Etapa 10)

A primeira IA do projeto foi implementada usando **Q-Learning tabular**, uma
técnica clássica de Reinforcement Learning (Aprendizado por Reforço). Ela
roda inteiramente em JavaScript, no navegador, e pode ser alternada em
tempo real com o algoritmo de regras fixas da Etapa 9 através do botão
"Ativar IA (Q-Learning)" na interface.

### Por que Q-Learning tabular?

Como o projeto ainda está inteiramente em JavaScript (sem backend Python),
optamos por uma técnica de RL simples o suficiente para ser implementada
sem bibliotecas externas, mas que já demonstra o conceito central pedido
pelo projeto: **a IA observa o estado do trânsito, toma decisões, e
aprende estratégias melhores ao longo do tempo.**

### Estado, Ação e Recompensa

- **Estado observado pela IA:** combinação de
  - qual grupo de semáforo está verde (leste-oeste ou norte-sul);
  - o tamanho da fila do grupo que está verde (discretizado em 0, 1, 2 ou "3+");
  - o tamanho da fila do grupo oposto (mesma discretização).

  Isso resulta em um número pequeno de estados possíveis (2 grupos × 4 faixas
  × 4 faixas = 32 estados), o que torna viável usar uma tabela simples em
  vez de uma rede neural.

- **Ações possíveis:**
  - `KEEP`: manter o sinal verde atual;
  - `SWITCH`: iniciar a troca (verde → amarelo → tudo vermelho → outro grupo).

  A IA só é consultada depois que o verde mínimo de segurança
  (`MIN_GREEN_DURATION`) já foi cumprido, e o verde máximo
  (`MAX_GREEN_DURATION`) continua sendo um limite de segurança absoluto,
  válido tanto para a IA quanto para o algoritmo de regras.

- **Recompensa:** a cada decisão, a recompensa é o **negativo da soma das
  filas** dos dois grupos naquele momento (`-(filaVerde + filaOposta)`).
  Ou seja, quanto menores as filas, maior (menos negativa) a recompensa.
  Isso incentiva o agente a aprender políticas que mantêm o tráfego fluindo.

### Aprendizado

A cada nova decisão, o agente atualiza o valor Q da decisão anterior usando
a equação padrão do Q-Learning:

```
Q(s, a) = Q(s, a) + alpha * (recompensa + gamma * max(Q(s', a')) - Q(s, a))
```

- `alpha` (taxa de aprendizado) = 0.15
- `gamma` (fator de desconto) = 0.9

### Exploração vs. Aproveitamento

A IA usa uma política **epsilon-greedy**: com probabilidade `epsilon`, ela
escolhe uma ação aleatória (exploração); caso contrário, escolhe a ação com
maior valor Q conhecido (aproveitamento). O valor de `epsilon` começa em 1.0
(100% exploração) e decai gradualmente até um mínimo de 0.05 ao longo das
primeiras ~1500 decisões, para que o agente explore bastante no início e
se estabilize em uma política aprendida depois. O valor atual de epsilon é
exibido no painel de métricas quando a IA está ativa.

### Limitações desta primeira versão

- A tabela Q é reiniciada a cada vez que a página é recarregada — não há
  persistência do aprendizado entre sessões.
- O estado é bem simplificado (não considera, por exemplo, há quanto tempo
  cada carro está esperando, apenas a contagem de carros parados).
- Por ser tabular, essa abordagem não escala bem para cenários muito mais
  complexos (múltiplos cruzamentos, mais ações possíveis, etc.) — nesses
  casos, o caminho natural é migrar para uma rede neural (Deep
  Reinforcement Learning), possivelmente treinada em Python.

### Comparando IA vs. regras fixas

O botão "Ativar IA (Q-Learning)" / "Usar regras fixas" na interface permite
alternar entre os dois controladores em tempo real, e o painel de métricas
(tempo médio de espera, fila atual) permite observar informalmente qual
controlador está indo melhor em um dado momento. Uma comparação mais
rigorosa (rodar os dois por tempo igual, em condições de tráfego
equivalentes, e comparar métricas agregadas) fica como evolução futura do
projeto.

## Próximos Passos (planejado)

- Persistir o aprendizado da IA (ex: salvar a tabela Q).
- Enriquecer o estado observado pela IA (tempo de espera, não só contagem).
- Avaliar migrar para Python + um framework de RL (ex: Stable-Baselines3)
  para técnicas mais avançadas, à medida que o projeto crescer em
  complexidade (múltiplos cruzamentos, mais tipos de veículos, pedestres,
  veículos de emergência).
- Criar um modo de comparação automatizado entre IA e semáforos
  tradicionais, com métricas agregadas lado a lado.