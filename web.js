var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json())
app.use(express.static('public'));

app.get('/api/session', function (req, res) {
	var session = JSON.parse(JSON.stringify(global.session));
	delete session.config.api_key;
	delete session.config.api_secret;
  	res.json(session);
});

app.get('/api/data', function (req, res) {
	var data = {
		buy: [],
		sell: [],
		prices: []
	};

	var prices = global.price_data;
	if(prices) {
		data.buy = prices[2].y.map(function(p, i) {
			return {
				x: i,
				y: p
			};
		});
		data.sell = prices[1].y.map(function(p, i) {
			return {
				x: i,
				y: p
			};
		});
		data.prices = prices[0].y.map(function(p, i) {
			return {
				x: i,
				y: p
			};
		});
	}

  	res.json(data);
});

app.post('/api/updateBuy/', function(req, res) {
	if(req.body != null && req.body.price != null) {
		global.moveOrder('buy', req.body.price, function(moveResult) {
			global.session.config.currencies.buy_at = req.body.price;
			return res.json({ success: true, body: req.body, move: moveResult });
		});
	} else {
		res.json({ success: false, body: req.body });
	}
});

app.post('/api/updateSell/', function(req, res) {
	if(req.body != null && req.body.price != null) {
		global.moveOrder('sell', req.body.price, function(moveResult) {
			global.session.config.currencies.sell_at = req.body.price;
			return res.json({ success: true, body: req.body, move: moveResult });
		});
	} else {
		res.json({ success: false, body: req.body });
	}
});

app.listen(global.session.config.port, function () {
  	console.log('Listening on port 3000!')
})