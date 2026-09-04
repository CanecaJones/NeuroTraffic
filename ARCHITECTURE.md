# Arquitetura - NeuroTraffic

Este documento descreve a arquitetura do projeto e evolui junto com o desenvolvimento.

## Visão Geral

NeuroTraffic é um simulador visual de gerenciamento inteligente de tráfego.
Inicia como uma aplicação simples em HTML/CSS/JavaScript rodando no navegador,
com o objetivo de evoluir para incluir Inteligência Artificial (incluindo
Reinforcement Learning) no controle de semáforos e cruzamentos.

## Estrutura Atual (Etapa 1)

```
neurotraffic/
├── index.html          # Página principal, contém o canvas da simulação
├── css/
│   └── style.css       # Estilos visuais da interface
├── js/
│   └── main.js         # Ponto de entrada da aplicação
├── docs/
│   ├── architecture.md # Este documento
│   └── ai.md           # Documentação da IA (a ser detalhada nas próximas etapas)
└── README.md           # Visão geral do projeto
```

## Estrutura Futura (planejada)

Conforme o projeto evolui, o código JavaScript será organizado em módulos
dentro de `js/`, refletindo os seguintes domínios:

```
simulation/      # Loop principal da simulação
ai/              # Lógica de decisão e algoritmos de IA
traffic/         # Regras de tráfego
vehicles/        # Lógica e representação dos veículos
roads/           # Representação das vias e cruzamentos
traffic_lights/  # Lógica e estados dos semáforos
ui/              # Elementos de interface e controles
metrics/         # Coleta e exibição de métricas
```

Essas pastas serão criadas apenas quando houver código suficiente para
justificá-las, evitando abstrações prematuras.

## Decisões Técnicas

- **Etapa 1**: escolhido HTML + CSS + JavaScript puro (sem frameworks) para
  manter o início simples e sem dependências, permitindo rodar diretamente
  no navegador.
- Um único `<canvas>` será usado para desenhar toda a simulação (rua,
  cruzamento, semáforos e veículos).
- Futuras etapas poderão introduzir Python para treinamento de IA e,
  potencialmente, React/Django/PostgreSQL/Docker caso o projeto justifique
  essa complexidade.