var args = process.argv.slice(2);
var config_file = args.length > 0 ? args[0] : './configs/config.json';
var config = require(config_file);
var display = require('./graphics.js');
var Poloniex = require('poloniex.js');
var poloniex = new Poloniex(config.api_key, config.api_secret);


display.log("Starting Pinnex for " + config.currencies.from + "_" + config.currencies.to);
display.log("Profit per ping " + (((config.currencies.sell_at - config.currencies.buy_at) / config.currencies.sell_at) * 100).toFixed(2) + "%");

var session = {
	last_order: null,
	last_price: null,
	init_order: null,
	total_sells: 0,
	total_buys: 0
}

function getCurrentPrice(cb) {
	poloniex.returnTicker(function(err, data) {
	    if (err){
	        // handle error
	    }
	    session.last_price = data[config.currencies.from + "_" + config.currencies.to].last;
	    //display.log("Current Price: " + session.last_price);
	    cb(session.last_price)
	});
}

function getPreviousPrices(cb) {
	var now = parseInt((new Date().getTime() / 1000).toFixed(0))
	var before = parseInt((new Date(new Date() - (1000 * 60 * 180)).getTime() / 1000).toFixed(0))
	poloniex.returnChartData(config.currencies.from, config.currencies.to, 300, before, now, function(err, data) {
	    if (err){
	        display.log(err.toString());
	    }
	    if(data != null && data.error != null) {
	    	display.log(data.error);
	    }


	    var close_prices = data.map(function(d) {
	    	return { 
	    		date: new Date(d.date * 1000),
	    		price: d.close
	    	};
	    });

	    close_prices.push({ 
    		date: new Date(),
    		price: session.last_price
    	});

	    //display.log(close_prices);
	    cb(close_prices);
	});
}

function checkLastOrderType(cb) {
	poloniex.myOpenOrders(config.currencies.from, config.currencies.to, function(err, data){
	    if (err){
	        display.log(err.toString());
	    }
	    if(data != null && data.error != null) {
	    	display.log(data.error);
	    }


	    if(data.length > 0) {
	    	session.last_order = data[0].type;
	    	display.log("Last Order Type: " + session.last_order);
		} else {
			session.init_order = true;
			session.total_sells--;
			display.log("Last Order Type: None(Will buy to start)");
		}
	    cb();
	});
}

function placeBuyOrder(cb) {
	cb = cb || function() {};
	display.log("Placing buy order price was " + session.last_price);
	session.total_sells++;
	display.log(config.currencies.from + "_" + config.currencies.to + " " + config.currencies.buy_at + " " +  (1 / config.currencies.buy_at) * config.currencies.amount);
	if(config.debug == true) {
		return;
	}
	poloniex.buy(config.currencies.from, config.currencies.to, config.currencies.buy_at, (1 / config.currencies.buy_at) * config.currencies.amount, function (err, data) {
		if (err){
	        display.log(err.toString());
	    }
	    if(data != null && data.error != null) {
	    	display.log(data.error);
	    }

		cb(data);
	});
}

function placeSellOrder(cb) {
	cb = cb || function() {};
	display.log("Placing sell order price was " + session.last_price);
	session.total_buys++;
	display.log(config.currencies.from + "_" + config.currencies.to + " " + config.currencies.sell_at + " " +  (1 / config.currencies.sell_at) * config.currencies.amount);
	if(config.debug == true) {
		return;
	}
	poloniex.sell(config.currencies.from, config.currencies.to, config.currencies.sell_at, (1 / config.currencies.sell_at) * config.currencies.amount, function (err, data) {
		if (err){
	        display.log(err.toString());
	    }
	    if(data != null && data.error != null) {
	    	display.log(data.error);
	    }


		cb(data);
	});
}

function tick() {
	getCurrentPrice(function() {
		if(session.last_price > config.currencies.sell_at && session.last_order != 'buy' || session.init_order == true) {
			session.init_order = false;
			session.last_order = 'buy';
			//Place Buy Order
			placeBuyOrder();
		} else if(session.last_price < config.currencies.buy_at && session.last_order != 'sell') {
			session.last_order = 'sell';
			//Place Sell Order
			placeSellOrder();
		}
	});

	getPreviousPrices(function (prices) {
		var price_data = [
			{ 
				x: prices.map(function(p, i) { return i.toString(); }), 
				y: prices.map(function(p) { return p.price * config.currencies.multiplier; }),
				style: {
	              	line: 'yellow'
             	}
			},
			{ 
				x: prices.map(function(p, i) { return i.toString(); }), 
				y: prices.map(function(p) { return config.currencies.sell_at * config.currencies.multiplier; }),
				style: {
	              	line: 'red'
             	}
			},
			{ 
				x: prices.map(function(p, i) { return i.toString(); }), 
				y: prices.map(function(p) { return config.currencies.buy_at * config.currencies.multiplier; }),
				style: {
	              	line: 'red'
             	}
			}
		];

		var stats_data = { 
			headers: ['', ''], 
			data: [ 
				['Total Buys', session.total_buys], 
				['Total Sells', session.total_sells] 
			]
		};

		display.updatePrices(price_data);
		display.updateStats(stats_data);
		display.render();
	});
}

getCurrentPrice(function() {
	checkLastOrderType(function () {
		display.setup();

		tick();
		setInterval(function() {
			tick();
		}, 5000);
	});
});
