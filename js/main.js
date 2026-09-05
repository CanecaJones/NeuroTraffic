// NeuroTraffic - Ponto de entrada da simulação
// Etapa 9: substitui o ciclo de semáforo de tempo fixo por um algoritmo
// simples de decisão baseado em regras (tamanho da fila de cada grupo).
// IMPORTANTE: isso ainda NÃO é Inteligência Artificial (nada é aprendido).
// É uma heurística fixa, que servirá de baseline para comparação com a
// IA real, introduzida na Etapa 10.

const ROAD_WIDTH = 120;
const MAX_CARS = 12;
const SPAWN_MIN_INTERVAL = 0.8; // segundos
const SPAWN_MAX_INTERVAL = 2.2; // segundos
const CAR_COLORS = ["#e53935", "#1e88e5", "#fdd835", "#8e24aa", "#43a047", "#fb8c00"];
const CAR_LENGTH = 30; // igual à largura do carro (no eixo de movimento)
const MIN_GAP = 8; // distância mínima entre o para-choque de um carro e o do próximo
const STOP_GAP = 6; // distância entre o nariz do carro e a linha de parada
const WAITING_MOVEMENT_THRESHOLD = 1; // px por quadro abaixo do qual o carro é considerado "parado"

// Parâmetros do algoritmo de decisão do semáforo (Etapa 9).
const MIN_GREEN_DURATION = 3; // segundos mínimos de verde, mesmo com fila pequena
const MAX_GREEN_DURATION = 10; // segundos máximos de verde, mesmo com fila grande
const YELLOW_DURATION = 2; // segundos de amarelo
const ALL_RED_DURATION = 1; // segundos de "tudo vermelho" na troca (segurança)
const SWITCH_QUEUE_ADVANTAGE = 2; // quantos carros a mais a fila oposta precisa ter para forçar a troca

const DIRECTIONS = {
  FROM_WEST: "from-west", // entra pela esquerda, indo para leste
  FROM_EAST: "from-east", // entra pela direita, indo para oeste
  FROM_NORTH: "from-north", // entra por cima, indo para sul
  FROM_SOUTH: "from-south", // entra por baixo, indo para norte
};

// Grupos de semáforo: EW controla as entradas leste/oeste,
// NS controla as entradas norte/sul. Apenas um grupo fica verde por vez.
const LIGHT_GROUPS = {
  EW: "ew",
  NS: "ns",
};

const LIGHT_COLORS = {
  RED: "red",
  YELLOW: "yellow",
  GREEN: "green",
};

// Fases internas do controlador de semáforo (diferente de LIGHT_COLORS:
// aqui representa em que estágio do ciclo de troca o sistema está).
const LIGHT_PHASES = {
  GREEN: "green",
  YELLOW: "yellow",
  ALL_RED: "all-red",
};

let canvas;
let ctx;
let cars = [];
let lastTimestamp = null;
let spawnTimer = 0;
let nextCarId = 0;

let trafficLights;
let metrics;
let metricsElements;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("simulationCanvas");
  ctx = canvas.getContext("2d");

  spawnTimer = randomBetween(SPAWN_MIN_INTERVAL, SPAWN_MAX_INTERVAL);
  trafficLights = createTrafficLightSystem();
  metrics = createMetrics();
  metricsElements = {
    spawned: document.getElementById("metric-spawned"),
    crossed: document.getElementById("metric-crossed"),
    avgWait: document.getElementById("metric-avg-wait"),
    queue: document.getElementById("metric-queue"),
  };

  console.log("NeuroTraffic: algoritmo de decisão baseado em regras ativo. Pronto para a Etapa 10.");
  requestAnimationFrame(gameLoop);
});

/**
 * Loop principal da simulação. Calcula o tempo decorrido desde o último
 * quadro (delta time), atualiza o estado da simulação e redesenha a cena.
 */
function gameLoop(timestamp) {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  }

  const deltaSeconds = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  update(deltaSeconds);
  render();

  requestAnimationFrame(gameLoop);
}

/**
 * Atualiza a simulação a cada quadro: move os carros respeitando sinais
 * e fila, atualiza as métricas, remove os carros que saíram do canvas,
 * controla a geração de novos veículos e, por fim, decide o estado do
 * semáforo com base nas filas atuais.
 */
function update(deltaSeconds) {
  moveCarsWithTrafficRules(deltaSeconds);

  cars = cars.filter((car) => {
    const hasLeft = hasLeftCanvas(car, canvas);
    if (hasLeft) {
      metrics.totalCrossed += 1;
      metrics.totalWaitTimeSum += car.waitTime;
    }
    return !hasLeft;
  });

  metrics.currentQueue = cars.filter((car) => car.isWaiting).length;

  updateSpawning(deltaSeconds);

  // A decisão do semáforo depende do tamanho atual da fila de cada
  // grupo, por isso é atualizada por último, já com os carros no
  // estado deste quadro.
  updateTrafficLights(deltaSeconds);
}

/**
 * Cria o objeto de métricas inicial, zerado.
 */
function createMetrics() {
  return {
    totalSpawned: 0,
    totalCrossed: 0,
    totalWaitTimeSum: 0, // soma do tempo de espera (em segundos) de todos os carros que já atravessaram
    currentQueue: 0,
  };
}

/**
 * Move todos os carros respeitando duas regras básicas:
 *   1. Não ultrapassar a linha de parada quando o semáforo do seu grupo
 *      não estiver verde (a menos que já tenha entrado no cruzamento).
 *   2. Não ultrapassar o carro imediatamente à frente na mesma faixa
 *      (mesma direção de entrada), evitando colisões.
 *
 * Também mede, para cada carro, se ele está "parado" neste quadro
 * (movimento efetivo abaixo de um limite), acumulando isso em
 * car.waitTime para calcular métricas de espera.
 */
function moveCarsWithTrafficRules(deltaSeconds) {
  const carsByDirection = groupCarsByDirection(cars);

  Object.keys(carsByDirection).forEach((direction) => {
    const group = carsByDirection[direction];

    // Ordena do carro mais avançado (mais próximo do destino) para o mais atrasado,
    // para que cada carro só possa ser limitado pelo carro processado antes dele.
    group.sort((a, b) => getProgress(b) - getProgress(a));

    let previousCarProgress = null;

    group.forEach((car) => {
      const currentProgress = getProgress(car);
      const desiredProgress = currentProgress + car.speed * deltaSeconds;

      let allowedProgress = desiredProgress;

      // Regra 1: respeitar o carro da frente (mesma direção).
      if (previousCarProgress !== null) {
        const maxProgressBehindCarAhead = previousCarProgress - CAR_LENGTH - MIN_GAP;
        allowedProgress = Math.min(allowedProgress, maxProgressBehindCarAhead);
      }

      // Regra 2: respeitar o semáforo, exceto se o carro já entrou no cruzamento.
      const stopLimit = getStopLimit(car, currentProgress);
      if (stopLimit !== null) {
        allowedProgress = Math.min(allowedProgress, stopLimit);
      }

      // O carro nunca anda para trás.
      const newProgress = Math.max(currentProgress, allowedProgress);

      // Métricas: se o carro avançou muito pouco neste quadro, ele está "esperando".
      const actualMovement = newProgress - currentProgress;
      car.isWaiting = actualMovement < WAITING_MOVEMENT_THRESHOLD;
      if (car.isWaiting) {
        car.waitTime += deltaSeconds;
      }

      setProgress(car, newProgress);
      previousCarProgress = newProgress;
    });
  });
}

/**
 * Agrupa os carros por direção de entrada (spawnDirection).
 */
function groupCarsByDirection(cars) {
  const groups = {};
  cars.forEach((car) => {
    if (!groups[car.spawnDirection]) {
      groups[car.spawnDirection] = [];
    }
    groups[car.spawnDirection].push(car);
  });
  return groups;
}

/**
 * Retorna o "progresso" do carro ao longo de seu caminho: um valor que
 * sempre aumenta conforme o carro se aproxima do seu destino, seja qual
 * for o eixo (x ou y) e o sentido real do movimento.
 */
function getProgress(car) {
  switch (car.spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      return car.x;
    case DIRECTIONS.FROM_EAST:
      return -car.x;
    case DIRECTIONS.FROM_NORTH:
      return car.y;
    case DIRECTIONS.FROM_SOUTH:
      return -car.y;
  }
}

/**
 * Aplica um valor de progresso de volta à posição real (x ou y) do carro,
 * de acordo com sua direção de entrada.
 */
function setProgress(car, progress) {
  switch (car.spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      car.x = progress;
      break;
    case DIRECTIONS.FROM_EAST:
      car.x = -progress;
      break;
    case DIRECTIONS.FROM_NORTH:
      car.y = progress;
      break;
    case DIRECTIONS.FROM_SOUTH:
      car.y = -progress;
      break;
  }
}

/**
 * Calcula o limite de progresso imposto pelo semáforo para este carro.
 * Retorna null se o semáforo não impuser nenhum limite no momento
 * (sinal verde, ou o carro já passou da linha de parada e está
 * comprometido a cruzar o cruzamento).
 */
function getStopLimit(car, currentProgress) {
  const group = getLightGroupForDirection(car.spawnDirection);
  const color = getGroupColor(group);

  if (color === LIGHT_COLORS.GREEN) {
    return null;
  }

  const nearEdgeProgress = getNearEdgeProgress(car.spawnDirection, canvas);
  const halfCarLength = CAR_LENGTH / 2;
  const noseProgress = currentProgress + halfCarLength;

  // Se o carro já alcançou a borda do cruzamento, deixamos ele terminar
  // de atravessar em vez de pará-lo no meio da via.
  if (noseProgress >= nearEdgeProgress) {
    return null;
  }

  return nearEdgeProgress - STOP_GAP - halfCarLength;
}

/**
 * Retorna a que grupo de semáforo (EW ou NS) pertence uma direção de entrada.
 */
function getLightGroupForDirection(spawnDirection) {
  return spawnDirection === DIRECTIONS.FROM_WEST || spawnDirection === DIRECTIONS.FROM_EAST
    ? LIGHT_GROUPS.EW
    : LIGHT_GROUPS.NS;
}

/**
 * Retorna, em unidades de "progresso", a posição da borda do cruzamento
 * mais próxima da origem de cada direção — ou seja, o ponto a partir do
 * qual o carro está prestes a entrar na área do cruzamento.
 */
function getNearEdgeProgress(spawnDirection, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const halfRoad = ROAD_WIDTH / 2;

  switch (spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      return centerX - halfRoad;
    case DIRECTIONS.FROM_EAST:
      return -(centerX + halfRoad);
    case DIRECTIONS.FROM_NORTH:
      return centerY - halfRoad;
    case DIRECTIONS.FROM_SOUTH:
      return -(centerY + halfRoad);
  }
}

/**
 * Controla o timer de geração de veículos. Quando o timer chega a zero,
 * tenta gerar um novo carro (respeitando o limite máximo simultâneo) e
 * sorteia um novo intervalo até a próxima geração.
 */
function updateSpawning(deltaSeconds) {
  spawnTimer -= deltaSeconds;

  if (spawnTimer <= 0) {
    if (cars.length < MAX_CARS) {
      cars.push(createRandomCar(canvas));
      metrics.totalSpawned += 1;
    }
    spawnTimer = randomBetween(SPAWN_MIN_INTERVAL, SPAWN_MAX_INTERVAL);
  }
}

/**
 * Cria o sistema de semáforos. O grupo EW começa verde, no estágio
 * "green", com o timer zerado.
 */
function createTrafficLightSystem() {
  return {
    greenGroup: LIGHT_GROUPS.EW,
    phase: LIGHT_PHASES.GREEN,
    timer: 0,
  };
}

/**
 * Algoritmo simples de decisão do semáforo (baseado em regras fixas,
 * SEM aprendizado — a "IA" de verdade vem na Etapa 10).
 *
 * Regras:
 *   - O grupo com sinal verde permanece verde por, no mínimo,
 *     MIN_GREEN_DURATION segundos (mesmo que a fila oposta esteja maior),
 *     para evitar trocas rápidas demais.
 *   - Após o mínimo, o sinal troca para amarelo caso:
 *       a) o grupo atual já não tenha mais fila (nenhum carro esperando); ou
 *       b) a fila do grupo oposto seja consideravelmente maior
 *          (diferença >= SWITCH_QUEUE_ADVANTAGE).
 *   - Independentemente da fila, o verde nunca dura mais que
 *     MAX_GREEN_DURATION segundos, para não deixar o grupo oposto
 *     esperando indefinidamente.
 *   - Após o amarelo, há um breve período de "tudo vermelho"
 *     (ALL_RED_DURATION) antes do outro grupo abrir, por segurança.
 */
function updateTrafficLights(deltaSeconds) {
  trafficLights.timer += deltaSeconds;

  if (trafficLights.phase === LIGHT_PHASES.GREEN) {
    const otherGroup = getOtherGroup(trafficLights.greenGroup);
    const currentQueue = getQueueLengthForGroup(trafficLights.greenGroup);
    const otherQueue = getQueueLengthForGroup(otherGroup);

    const reachedMinGreen = trafficLights.timer >= MIN_GREEN_DURATION;
    const reachedMaxGreen = trafficLights.timer >= MAX_GREEN_DURATION;
    const currentQueueIsEmpty = currentQueue === 0;
    const otherQueueIsMuchBigger = otherQueue - currentQueue >= SWITCH_QUEUE_ADVANTAGE;

    const shouldSwitch = reachedMaxGreen || (reachedMinGreen && (currentQueueIsEmpty || otherQueueIsMuchBigger));

    if (shouldSwitch) {
      trafficLights.phase = LIGHT_PHASES.YELLOW;
      trafficLights.timer = 0;
    }
  } else if (trafficLights.phase === LIGHT_PHASES.YELLOW) {
    if (trafficLights.timer >= YELLOW_DURATION) {
      trafficLights.phase = LIGHT_PHASES.ALL_RED;
      trafficLights.timer = 0;
    }
  } else if (trafficLights.phase === LIGHT_PHASES.ALL_RED) {
    if (trafficLights.timer >= ALL_RED_DURATION) {
      trafficLights.greenGroup = getOtherGroup(trafficLights.greenGroup);
      trafficLights.phase = LIGHT_PHASES.GREEN;
      trafficLights.timer = 0;
    }
  }
}

/**
 * Retorna o grupo oposto ao informado ("ew" -> "ns" e vice-versa).
 */
function getOtherGroup(group) {
  return group === LIGHT_GROUPS.EW ? LIGHT_GROUPS.NS : LIGHT_GROUPS.EW;
}

/**
 * Conta quantos carros de um grupo de semáforo (EW ou NS) estão
 * atualmente parados/esperando (car.isWaiting), usado pelo algoritmo de
 * decisão para comparar o tamanho das filas.
 */
function getQueueLengthForGroup(group) {
  return cars.filter((car) => car.isWaiting && getLightGroupForDirection(car.spawnDirection) === group).length;
}

/**
 * Retorna a cor atual (red/yellow/green) de um grupo de semáforo
 * ("ew" ou "ns"), com base no grupo que está com o verde e na fase
 * atual do controlador.
 */
function getGroupColor(group) {
  const isGreenGroup = group === trafficLights.greenGroup;

  if (!isGreenGroup) {
    return LIGHT_COLORS.RED;
  }

  if (trafficLights.phase === LIGHT_PHASES.GREEN) {
    return LIGHT_COLORS.GREEN;
  }
  if (trafficLights.phase === LIGHT_PHASES.YELLOW) {
    return LIGHT_COLORS.YELLOW;
  }
  return LIGHT_COLORS.RED; // fase "all-red"
}

/**
 * Verifica se um carro já saiu completamente da área visível do canvas,
 * considerando sua direção de movimento.
 */
function hasLeftCanvas(car, canvas) {
  const margin = 40;

  switch (car.spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      return car.x > canvas.width + margin;
    case DIRECTIONS.FROM_EAST:
      return car.x < -margin;
    case DIRECTIONS.FROM_NORTH:
      return car.y > canvas.height + margin;
    case DIRECTIONS.FROM_SOUTH:
      return car.y < -margin;
    default:
      return false;
  }
}

/**
 * Cria um carro em uma das quatro entradas do cenário, escolhida
 * aleatoriamente, já posicionado na faixa correta e fora da área visível
 * do canvas (para "entrar" na cena de forma natural).
 */
function createRandomCar(canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const laneOffset = ROAD_WIDTH / 4;
  const spawnMargin = 40;

  const directionKeys = Object.values(DIRECTIONS);
  const spawnDirection = directionKeys[Math.floor(Math.random() * directionKeys.length)];

  let x, y, angle;

  switch (spawnDirection) {
    case DIRECTIONS.FROM_WEST:
      x = -spawnMargin;
      y = centerY + laneOffset;
      angle = 0;
      break;
    case DIRECTIONS.FROM_EAST:
      x = canvas.width + spawnMargin;
      y = centerY - laneOffset;
      angle = Math.PI;
      break;
    case DIRECTIONS.FROM_NORTH:
      x = centerX + laneOffset;
      y = -spawnMargin;
      angle = Math.PI / 2;
      break;
    case DIRECTIONS.FROM_SOUTH:
      x = centerX - laneOffset;
      y = canvas.height + spawnMargin;
      angle = -Math.PI / 2;
      break;
  }

  return {
    id: `car-${nextCarId++}`,
    x,
    y,
    width: CAR_LENGTH,
    height: 16,
    color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    direction: angle,
    spawnDirection,
    speed: randomBetween(70, 110),
    waitTime: 0,
    isWaiting: false,
  };
}

/**
 * Retorna um número aleatório entre min e max (inclusive min, exclusive max).
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Redesenha a cena inteira: fundo, ruas, cruzamento, semáforos, todos os
 * carros em suas posições atuais, e atualiza o painel de métricas.
 */
function render() {
  drawScene(ctx, canvas);
  drawTrafficLights(ctx, canvas);
  cars.forEach((car) => drawCar(ctx, car));
  renderMetricsPanel();
}

/**
 * Atualiza os elementos do DOM do painel de métricas com os valores
 * atuais: total gerado, total que atravessou, tempo médio de espera e
 * tamanho da fila atual.
 */
function renderMetricsPanel() {
  const averageWait = metrics.totalCrossed > 0 ? metrics.totalWaitTimeSum / metrics.totalCrossed : 0;

  metricsElements.spawned.textContent = metrics.totalSpawned;
  metricsElements.crossed.textContent = metrics.totalCrossed;
  metricsElements.avgWait.textContent = `${averageWait.toFixed(1)}s`;
  metricsElements.queue.textContent = metrics.currentQueue;
}

/**
 * Desenha os quatro semáforos do cruzamento, um em cada canto, exibindo
 * a cor atual do grupo correspondente (EW nos cantos superior-direito e
 * inferior-esquerdo; NS nos cantos superior-esquerdo e inferior-direito).
 */
function drawTrafficLights(ctx, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const halfRoad = ROAD_WIDTH / 2;
  const offset = 35;

  const ewColor = getGroupColor(LIGHT_GROUPS.EW);
  const nsColor = getGroupColor(LIGHT_GROUPS.NS);

  drawTrafficLightBox(ctx, centerX - halfRoad - offset, centerY - halfRoad - offset, nsColor); // topo-esquerda
  drawTrafficLightBox(ctx, centerX + halfRoad + offset, centerY - halfRoad - offset, ewColor); // topo-direita
  drawTrafficLightBox(ctx, centerX - halfRoad - offset, centerY + halfRoad + offset, ewColor); // baixo-esquerda
  drawTrafficLightBox(ctx, centerX + halfRoad + offset, centerY + halfRoad + offset, nsColor); // baixo-direita
}

/**
 * Desenha uma caixa de semáforo (fundo escuro + três círculos: vermelho,
 * amarelo e verde), destacando com brilho total a cor ativa e deixando
 * as demais escurecidas.
 */
function drawTrafficLightBox(ctx, x, y, activeColor) {
  const boxWidth = 20;
  const boxHeight = 52;
  const radius = 5;

  ctx.save();
  ctx.translate(x - boxWidth / 2, y - boxHeight / 2);

  // Corpo da caixa do semáforo
  ctx.fillStyle = "#1a1a1a";
  drawRoundedRect(ctx, 0, 0, boxWidth, boxHeight, radius);
  ctx.fill();

  const lightRadius = 6;
  const centerXOffset = boxWidth / 2;

  drawSignalLight(ctx, centerXOffset, 12, lightRadius, "#ff4444", activeColor === LIGHT_COLORS.RED);
  drawSignalLight(ctx, centerXOffset, 26, lightRadius, "#ffeb3b", activeColor === LIGHT_COLORS.YELLOW);
  drawSignalLight(ctx, centerXOffset, 40, lightRadius, "#4caf50", activeColor === LIGHT_COLORS.GREEN);

  ctx.restore();
}

/**
 * Desenha um único círculo de sinal (farolete) do semáforo. Quando
 * "isActive" é verdadeiro, a cor é exibida em brilho total; caso
 * contrário, é desenhada escurecida para simular a lâmpada apagada.
 */
function drawSignalLight(ctx, x, y, radius, color, isActive) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? color : "#3a3a3a";
  ctx.fill();

  if (isActive) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/**
 * Desenha um único carro no canvas, como um retângulo com cantos
 * arredondados e uma pequena faixa indicando a frente do veículo.
 */
function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.direction);

  // Corpo do carro
  ctx.fillStyle = car.color;
  drawRoundedRect(ctx, -car.width / 2, -car.height / 2, car.width, car.height, 4);
  ctx.fill();

  // Indicador da frente do carro (farol)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(car.width / 2 - 4, -car.height / 2 + 2, 3, car.height - 4);

  ctx.restore();
}

/**
 * Desenha um retângulo com cantos arredondados no caminho atual do
 * contexto (não preenche nem contorna sozinho).
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Desenha a cena completa: fundo, ruas (horizontal e vertical) e o
 * cruzamento entre elas, incluindo faixas de pista tracejadas.
 */
function drawScene(ctx, canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const roadWidth = ROAD_WIDTH;
  const centerX = width / 2;
  const centerY = height / 2;

  // Fundo (grama / área externa às ruas)
  ctx.fillStyle = "#2f5d34";
  ctx.fillRect(0, 0, width, height);

  // Rua horizontal
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, centerY - roadWidth / 2, width, roadWidth);

  // Rua vertical
  ctx.fillRect(centerX - roadWidth / 2, 0, roadWidth, height);

  drawLaneDividers(ctx, width, height, roadWidth, centerX, centerY);
  drawCrosswalks(ctx, roadWidth, centerX, centerY);
}

/**
 * Desenha as linhas tracejadas centrais das ruas, interrompendo o
 * desenho na área do cruzamento.
 */
function drawLaneDividers(ctx, width, height, roadWidth, centerX, centerY) {
  ctx.strokeStyle = "#f4f4f4";
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);

  const halfRoad = roadWidth / 2;

  // Linha tracejada horizontal (interrompida no cruzamento)
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(centerX - halfRoad, centerY);
  ctx.moveTo(centerX + halfRoad, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  // Linha tracejada vertical (interrompida no cruzamento)
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, centerY - halfRoad);
  ctx.moveTo(centerX, centerY + halfRoad);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  ctx.setLineDash([]); // reseta o padrão de traço para outros desenhos
}

/**
 * Desenha faixas de pedestres (crosswalks) nas quatro entradas do
 * cruzamento, apenas como referência visual do limite da interseção.
 */
function drawCrosswalks(ctx, roadWidth, centerX, centerY) {
  const halfRoad = roadWidth / 2;
  const stripeCount = 6;
  const stripeThickness = 8;
  const stripeGap = roadWidth / stripeCount;

  ctx.fillStyle = "#f4f4f4";

  // Crosswalk superior (borda de cima do cruzamento)
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      centerY - halfRoad - 20,
      stripeThickness,
      15
    );
  }

  // Crosswalk inferior
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      centerY + halfRoad + 5,
      stripeThickness,
      15
    );
  }

  // Crosswalk esquerdo
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX - halfRoad - 20,
      centerY - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      15,
      stripeThickness
    );
  }

  // Crosswalk direito
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillRect(
      centerX + halfRoad + 5,
      centerY - halfRoad + i * stripeGap + (stripeGap - stripeThickness) / 2,
      15,
      stripeThickness
    );
  }
}