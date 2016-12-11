var args = process.argv.slice(2);
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var screen = blessed.screen();
var grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

var line = null;
var logger = grid.set(0, 8, 8, 4, contrib.log, { 
  fg: "green",
  selectedFg: "green",
  label: 'Server Log'
});
var table = grid.set(8,8,4,4, contrib.table, { 
  keys: true,
  fg: 'white',
  selectedFg: 'white',
  selectedBg: 'blue',
  interactive: true,
  label: 'Stats',
  border: {type: "line", fg: "cyan"},
  columnSpacing: 10,
  columnWidth: [12, 12]
});

module.exports.render = function render() {
  screen.render();
}

module.exports.setup = function setup() {
  line = grid.set(0, 0, 12, 8, contrib.line, { 
    width: 80, 
    height: 30,
    numYLabels: 10,
    style: { 
      line: "yellow", 
      text: "green", 
      baseline: "black"
    }, 
    xLabelPadding: 2, 
    xPadding: 5, 
    label: 'Price',
    minY: (global.session.config.currencies.buy_at - (global.session.config.currencies.buy_at * 0.01)) * global.session.config.currencies.multiplier,
    maxY: (global.session.config.currencies.sell_at + (global.session.config.currencies.sell_at * 0.01)) * global.session.config.currencies.multiplier
  });


  screen.append(line);
  screen.append(logger);
  screen.append(table);
  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
  });
  screen.render();
}

module.exports.updatePrices = function updatePrices(data) {
  line.setData(data);
}

module.exports.updateStats = function updateStats(data) {
  table.setData(data);
}

module.exports.log = function log(string) {
  logger.log(string);
}