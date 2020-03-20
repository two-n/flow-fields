/* CONSTANTS AND GLOBALS */
const lineCanvas = d3.select("#lineCanvas"),
  flowCanvas = d3.select("#fieldCanvas"),
  context = lineCanvas.node().getContext("2d"),
  flowCxt = flowCanvas.node().getContext("2d"),
  controlsIconWidth = 30,
  controlsWidth = controlsIconWidth * 3,
  controlPanelWidth = 200,
  width = (lineCanvas.node().width = flowCanvas.node().width = window.innerWidth),
  height = (lineCanvas.node().height = flowCanvas.node().height = window.innerHeight),
  opacityAlpha = 0.0075,
  ease = d3.easeCubic;

let controlContainer,
  points = [],
  animationTimer = false,
  friction = 0.99,
  scale = 0.003,
  res = 10;
 
/* INITIAL STATE */
let state = {
  controlsOpen: false,
  numPoints: 1200,
  speed: 0.025,
  showFlow: true,
  paused: false,
};

// user controls
const controls = {
  numPoints: {
    type: "text",
    display: "number of lines",
  },
  showFlow: {
    type: "checkbox",
    display: "show flow fields"
  }
};

// run the thang
init()

/* SET STATE FUNCTION */
function setStateWithCallback(nextState, callback = null) {
  state = Object.assign({}, state, nextState);
  console.log("state update", state);
  if(callback) { callback() };
}

function init() {
  console.log("state:", state)

  lineCanvas
    .on("click", () => pauseOrPlay())

  controlContainer = d3.select("div#controlsContainer")
    .style("width", `${controlsWidth + controlPanelWidth}px`)
    .style("right", `-${controlPanelWidth}px`)

  // replay 
  controlContainer
    .append("div")
    .attr("class", "replay")
    .style("right", `-${controlPanelWidth}px`)
    .on("click", () => {
      drawLines()
    })
    .append("img")
    .attr("src", "./assets/replay.svg")
    .style("width", `${controlsIconWidth}px`)
    .style("height", `${controlsIconWidth}px`)
    
  // save 
  controlContainer
    .append("div")
    .attr("class", "save")
    .style("right", `-${controlPanelWidth}px`)
    .append("a")
    .attr('download', 'flowfields.png')
    .attr('href', lineCanvas.node().toDataURL("image/png").replace("image/png", "image/octet-stream"))
    .append("img")
    .attr("src", "./assets/save.svg")
    .style("width", `${controlsIconWidth}px`)
    .style("height", `${controlsIconWidth}px`)

  // cog 
  controlContainer
    .append("div")
    .attr("class", "cog")
    .style("right", `-${controlPanelWidth}px`)
    .on("click", () => {
      setStateWithCallback({ controlsOpen: !state.controlsOpen }, toggleControlPanel)
    }).append("img")
    .attr("src", "./assets/cog.svg")
    .style("width", `${controlsIconWidth}px`)
    .style("height", `${controlsIconWidth}px`)

  const controlPanel = controlContainer
    .append("div")
    .attr("class", "controlPanel")
    .style("width", `${controlsWidth + controlPanelWidth}px`)
    .style("right", `-${controlPanelWidth}px`)

  const controlItems = controlPanel
    .selectAll(".controlItem")
    .data(Object.entries(controls))
    .join("div")
    .attr("class", "controlItem")

  controlItems
    .append("input")
    .attr("type", ([_, details]) => details.type)
    .attr("class", ([_, details]) => details.type)
    .property("checked", ([name, _]) => state[name])
    .on("click", ([name, details]) => {
      details.type === 'text' 
        ? null
        : setStateWithCallback({ [name]: !state[name] }, toggleFields)
    })
    // specific to the text input
    .attr("size", 5)
    .on("keypress", function([name, _]) {
      if (d3.event.keyCode === 13) setStateAndDraw({ [name]: +this.value})
    })

  controlItems
    .append("div")
    .attr("class", ([_, details]) => details.type)
    .classed("checked", ([name, _]) => name === state[name])
    .text(([_, details]) => details.display)

  drawAll()
}

function refreshPoints() {
  // create points
  points = [];
  for (let y = 0; y < state.numPoints; y += 1) {
    points.push({
      x: 0,
      y: 0,
      vx: Math.random(),
      vy: Math.random(),
    });
  }

  noise.seed(Math.random());
}

function resetTimer() {
  animationTimer = false
}

function pauseOrPlay() {
  if (!state.paused) {
    animationTimer.stop()
    setStateWithCallback({ paused: true })
  } else { 
    animationTimer.restart(animation) 
    setStateWithCallback({ paused: false })
  }
}

function cleanLines() {
  context.clearRect(0, 0, width, height);
}

function toggleControlPanel() {
  controlContainer
    .transition()
    .duration(500)
    .style("right", state.controlsOpen ? "0px" : `-${controlPanelWidth}px`)
}

function drawLines() {

  resetTimer();
  cleanLines();

  // get new points
  refreshPoints();

  // draw timer
  animationTimer = d3.timer(animation);
  
}

function drawAll() {
  drawLines();
  if (state.showFlow) drawFlowField()
}

function animation(elapsed) {
  // compute how far through the animation we are (0 to 1)
  const t = Math.min(1, ease(elapsed / 30000));
  
  drawLineInterval()

  // if this animation is over
  if (t === 1) {
    // stop this animationTimer since we are done animating.
    animationTimer.stop();
  }
}

function toggleFields() {
  state.showFlow ? drawFlowField() : cleanFields()
}

function cleanFields() {
  flowCxt.clearRect(0, 0, width, height);
}

function drawFlowField() {
  flowCxt.lineWidth = 0.1;
  for (var x = 0; x < width; x += res) {
    for (var y = 0; y < height; y += res) {
      var value = getValue(x, y);
      flowCxt.save();
      flowCxt.translate(x, y);
      flowCxt.rotate(value);
      flowCxt.beginPath();
      flowCxt.moveTo(0, 0);
      flowCxt.lineTo(res, 0);
      flowCxt.stroke();
      flowCxt.restore();
    }
  }
}

function drawLineInterval() {
  context.lineWidth = 0.15;
  context.strokeStyle = 'black'
  for (let i = 0; i < points.length; i++) {

    // get each point and do what we did before with a single point
    const p = points[i];

    let value = getValue(p.x, p.y);
    p.vx += Math.cos(value) * state.speed;
    p.vy += Math.sin(value) * state.speed;

    // console.log(p.vx, p.vy)
    // move to current position
    context.beginPath();
    context.moveTo(p.x, p.y);

    // add velocity to position and line to new position
    p.x += p.vx;
    p.y += p.vy;
    context.lineTo(p.x, p.y);
    context.stroke();

    // apply some friction so point doesn't speed up too much
    p.vx *= friction;
    p.vy *= friction;

    // wrap around edges of screen
    if (p.x > width) p.x = 0;
    if (p.y > height) p.y = 0;
    if (p.x < 0) p.x = width;
    if (p.y < 0) p.y = height;
  }
}

function getValue(x, y) {
  return noise.perlin2(x * scale, y * scale) * Math.PI * 2;
}
