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

🎉 Roadmap inicial completo — Etapa 10 (introdução da Inteligência
Artificial). O projeto já possui uma simulação visual funcional com IA
(Q-Learning) controlando os semáforos, alternável com um algoritmo de
regras fixas para comparação. Próximos passos ficam a critério de
evolução futura (veja a seção "Roadmap Futuro" abaixo).

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
4. Movimentação dos carros ✅
5. Geração aleatória de veículos ✅
6. Semáforos ✅
7. Regras básicas de trânsito ✅
8. Sistema de métricas ✅
9. Algoritmo simples de decisão ✅
10. Introdução da Inteligência Artificial ✅

## Roadmap Futuro (ideias, não planejado em detalhe ainda)

- Múltiplos cruzamentos
- Diferentes tipos de veículos
- Pedestres
- Veículos de emergência
- Comparação automatizada entre IA e semáforos tradicionais
- Persistência do aprendizado da IA
- Possível migração de parte da IA para Python (ex: Stable-Baselines3)

## Licença

A definir.