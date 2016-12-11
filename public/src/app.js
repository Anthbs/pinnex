var app = angular.module('Pinnex', ['ui.router', 'nvd3']);

app.config(function ($stateProvider, $urlRouterProvider) {
	var dashboard = {
	    name: 'dashboard',
	    url: '/dashboard',
	    templateUrl: 'views/dashboard.html',
	    controller: 'DashboardCtrl',
	    controllerAs: 'ctrl'
  	};

  	$stateProvider.state(dashboard);
  	$urlRouterProvider.otherwise('/dashboard');
});