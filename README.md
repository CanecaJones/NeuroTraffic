# NeuroTraffic

Simulador visual de gerenciamento inteligente de tráfego, com o objetivo de
explorar o uso de Inteligência Artificial (incluindo Reinforcement Learning)
para otimizar o controle de semáforos em um cruzamento.

## Objetivo

- Reduzir o tempo médio de espera dos veículos.
- Reduzir filas.
- Evitar colisões.
- Aumentar o número de carros que conseguem atravessar o cruzamento.
- Permitir que a IA aprenda estratégias melhores ao longo do tempo.

## Status do Projeto

🚧 Em desenvolvimento — Etapa 3 (primeiros carros).

## Tecnologias

**Fase atual:**
- HTML
- CSS
- JavaScript (Canvas API)

**Planejadas para o futuro:**
- Python (treinamento de IA / Reinforcement Learning)
- React (frontend, se necessário)
- Django (backend, se necessário)
- PostgreSQL (banco de dados, se necessário)
- Docker (containerização, se necessário)

## Estrutura do Projeto

```
neurotraffic/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── docs/
│   ├── architecture.md
│   └── ai.md
└── README.md
```

Veja mais detalhes em [docs/architecture.md](docs/architecture.md).

## Como Executar

Basta abrir o arquivo `index.html` diretamente no navegador, ou servir a
pasta com um servidor local simples, por exemplo:

```bash
npx serve .
```

## Documentação

- [Arquitetura](docs/architecture.md)
- [Inteligência Artificial](docs/ai.md)

## Roadmap (visão geral)

1. Estrutura inicial do projeto ✅
2. Ambiente visual com rua e cruzamento ✅
3. Primeiros carros ✅
4. Movimentação dos carros
5. Geração aleatória de veículos
6. Semáforos
7. Regras básicas de trânsito
8. Sistema de métricas
9. Algoritmo simples de decisão
10. Introdução da Inteligência Artificial

## Licença

A definir.