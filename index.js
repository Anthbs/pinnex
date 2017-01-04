var args = process.argv.slice(2);
var config_file = args.length > 0 ? args[0] : './configs/config.json';
var config = require(config_file);
var display = require('./graphics.js');
var Poloniex = require('poloniex.js');

global.session = {
	config: config,
	last_order: null,
	last_price: null,
	init_order: null,
	total_sells: 0,
	total_buys: 0
};
var web = require('./web.js');

var poloniex = new Poloniex(global.session.config.api_key, global.session.config.api_secret);

function getCurrentPrice(cb) {
	poloniex.returnTicker(function(err, data) {
	    if (err){
	        // handle error
	        return cb(null);
	    }
	    global.session.last_price = data[global.session.config.currencies.from + "_" + global.session.config.currencies.to].last;
	    //display.log("Current Price: " + global.session.last_price);
	    cb(global.session.last_price)
	});
}

function getPreviousPrices(cb) {
	var now = parseInt((new Date().getTime() / 1000).toFixed(0))
	var before = parseInt((new Date(new Date() - (1000 * 60 * 180)).getTime() / 1000).toFixed(0))
	poloniex.returnChartData(global.session.config.currencies.from, global.session.config.currencies.to, 300, before, now, function(err, data) {
	    if (err){
	        display.log(err.toString());
	    	return cb();
	    }
	    if(data != null && data.error != null) {
	    	display.log(data.error);
	    	return cb();
	    }


	    var close_prices = data.map(function(d) {
	    	return { 
	    		date: new Date(d.date * 1000),
	    		price: d.close
	    	};
	    });

	    close_prices.push({ 
    		date: new Date(),
    		price: global.session.last_price
    	});

	    //display.log(close_prices);
	    cb(close_prices);
	});
}

function checkLastOrderType(cb) {
	poloniex.myOpenOrders(global.session.config.currencies.from, global.session.config.currencies.to, function(err, data){
	    if (err){
	        display.log(err.toString());
	    }
	    if(data != null && data.error != null) {
	    	display.log(data.error);
	    }


	    if(data != null && data.length > 0) {
	    	global.session.last_order = data[0].type;
	    	display.log("Last Order Type: " + global.session.last_order);
		} else {
			global.session.init_order = true;
			global.session.total_sells--;
			display.log("Last Order Type: None(Will buy to start)");
		}
	    cb(data);
	});
}

function placeBuyOrder(cb) {
	cb = cb || function() {};
	display.log("Placing buy order price was " + global.session.last_price);
	global.session.total_sells++;
	display.log(global.session.config.currencies.from + "_" + global.session.config.currencies.to + " " + global.session.config.currencies.buy_at + " " +  (1 / global.session.config.currencies.buy_at) * global.session.config.currencies.amount);
	if(global.session.config.debug == true) {
		return;
	}
	poloniex.buy(global.session.config.currencies.from, global.session.config.currencies.to, global.session.config.currencies.buy_at, (1 / global.session.config.currencies.buy_at) * global.session.config.currencies.amount, function (err, data) {
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
	display.log("Placing sell order price was " + global.session.last_price);
	global.session.total_buys++;
	display.log(global.session.config.currencies.from + "_" + global.session.config.currencies.to + " " + global.session.config.currencies.sell_at + " " +  (1 / global.session.config.currencies.sell_at) * global.session.config.currencies.amount);
	if(global.session.config.debug == true) {
		return;
	}
	poloniex.sell(global.session.config.currencies.from, global.session.config.currencies.to, global.session.config.currencies.sell_at, (1 / global.session.config.currencies.sell_at) * global.session.config.currencies.amount, function (err, data) {
		if (err){
	        display.log(err.toString());
	    }
	    if(data != null && data.error != null) {
	    	display.log(data.error);
	    }


		cb(data);
	});
}

global.moveOrder = function moveOrder(type, price, cb) {
	cb = cb || function() {};
	display.log("Moving order to" + price);
	if(global.session.config.debug == true) {
		return;
	}

	checkLastOrderType(function(orders) {
		if(orders == null || orders.length == 0 || orders.filter == null) {
			return cb();
		}
		var ordersOfType = orders.filter(function(o) { return o.type == type; });
		if(ordersOfType.length == 0) {
			return cb();
		}
		var order = ordersOfType[0].orderNumber;
		var amount = (1 / price) * global.session.config.currencies.amount;
		display.log("Moving order" + order + " to " + price + " for " + amount);
		poloniex.moveOrder(order, price, amount, function (err, data) {
			if (err){
		        display.log(err.toString());
		    }
		    if(data != null && data.error != null) {
		    	display.log(data.error);
		    }


			cb(data);
		});
	})
}

function tick() {
	getCurrentPrice(function() {
		if(global.session.last_price > global.session.config.currencies.sell_at && global.session.last_order != 'buy' || global.session.init_order == true) {
			global.session.init_order = false;
			global.session.last_order = 'buy';
			//Place Buy Order
			placeBuyOrder();
		} else if(global.session.last_price < global.session.config.currencies.buy_at && global.session.last_order != 'sell') {
			global.session.last_order = 'sell';
			//Place Sell Order
			placeSellOrder();
		}
	});

	getPreviousPrices(function (prices) {
		if(prices == null) {
			return;
		}
		var price_data = [
			{ 
				x: prices.map(function(p, i) { return i.toString(); }), 
				y: prices.map(function(p) { return p.price * global.session.config.currencies.multiplier; }),
				style: {
	              	line: 'yellow'
             	}
			},
			{ 
				x: prices.map(function(p, i) { return i.toString(); }), 
				y: prices.map(function(p) { return global.session.config.currencies.sell_at * global.session.config.currencies.multiplier; }),
				style: {
	              	line: 'red'
             	}
			},
			{ 
				x: prices.map(function(p, i) { return i.toString(); }), 
				y: prices.map(function(p) { return global.session.config.currencies.buy_at * global.session.config.currencies.multiplier; }),
				style: {
	              	line: 'red'
             	}
			}
		];
		global.price_data = price_data;
		var stats_data = { 
			headers: ['', ''], 
			data: [ 
				['Total Buys', global.session.total_buys], 
				['Total Sells', global.session.total_sells] 
			]
		};

		display.updatePrices(price_data);
		display.updateStats(stats_data);
		display.render();
	});
}



display.log("Starting Pinnex for " + global.session.config.currencies.from + "_" + global.session.config.currencies.to);
display.log("Profit per ping " + (((global.session.config.currencies.sell_at - global.session.config.currencies.buy_at) / global.session.config.currencies.sell_at) * 100).toFixed(2) + "%");

getCurrentPrice(function() {
	checkLastOrderType(function () {
		display.setup();

		tick();
		setInterval(function() {
			tick();
		}, 30000);
	});
});
