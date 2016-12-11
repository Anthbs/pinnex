angular.module('Pinnex')
	.controller('DashboardCtrl', function ($http, $interval) {
		var vm = this;
		
		vm.chartOptions = {
	        chart: {
	            type: 'lineChart',
	            height: 500,
	            margin : {
	                top: 20,
	                right: 20,
	                bottom: 40,
	                left: 55
	            },
	            x: function(d){ return d.x; },
	            y: function(d){ return d.y; },
	            useInteractiveGuideline: true,
	            duration: 100,    
	            yAxis: {
	                tickFormat: function(d){
	                   return d3.format('.01f')(d);
	                }
	            }
	        }
	    };
	    vm.chartData = [];

	    function updateSession() {
	    	$http.get('api/session')
				.then(function(response) {
					vm.session = response.data;
					vm.chartData = [{ values: [], key: vm.session.config.currencies.from + '_' + vm.session.config.currencies.to }];
				});
	    }

	    function updatePriceData() {
	    	$http.get('api/data')
				.then(function(response) {
					var data = response.data;
					vm.chartData = [
						{ 
							values: data.prices, 
							key: vm.session.config.currencies.from + '_' + vm.session.config.currencies.to,
							//area: false,
							//color: 'blue'
						},
						{ 
							values: data.buy, 
							key: "Buy At",
							//area: false,
							//color: 'red'
						},
						{ 
							values: data.sell, 
							key: "Sell At",
							//area: false,
							//color: 'red'
						}
					];
				});
	    }

	    updateSession();
	    updatePriceData();
	    $interval(function() {
    		updateSession();
	    	updatePriceData();
	    }, 3000)

	    vm.setSell = function(price) {
	    	$http.post('api/updateSell', {
	    		price: price
	    	})
	    	.then(function(response) {
	    		if(response.data && response.data.success) {
	    			vm.session.config.currencies.sell_at = price;
	    		}
	    	});
	    }

	    vm.setBuy = function(price) {
	    	$http.post('api/updateBuy', {
	    		price: price
	    	})
	    	.then(function(response) {
	    		if(response.data && response.data.success) {
	    			vm.session.config.currencies.buy_at = price;
	    		}
	    	});
	    }
	});