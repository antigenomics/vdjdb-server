(function() {
	"use strict";
	Array.prototype.push_array = function(array) {
		this.push.apply(this, array);
	}


	var application = angular.module('filters_v2', ['ngWebSocket', 'table', 'notifications']);

	application.factory('filters_v2', ['$websocket', 'table', 'notify', 'filters_v2_tcr', 'filters_v2_mhc', function ($websocket, table, notify, filters_tcr, filters_mhc) {

		var columnsLoading = true;
        var error = false;

		var connection = $websocket('ws://' + location.host + '/filters/connect');
		var pingWebSocket = null;

		connection.onOpen(function() {
            connection.send({
                action: 'columns',
                data: {}
            });
            pingWebSocket = setInterval(function() {
                connection.send({
                    action: 'ping',
                    data: {}
                });
            }, 10000)
        });

        connection.onMessage(function(message) {
            var response = JSON.parse(message.data);
            var filter = {};
            switch (response.status) {
                case 'success':
                    switch (response.action) {
                        case 'columns':
                            table.setColumns(response.columns);
                            columnsLoading = false;
                            break;
                        default:
                            notify.notice('Search', 'Invalid response');
                            break;
                    }
                    break;
                case 'warn':
                    angular.forEach(response.warnings, function(warning) {
                        notify.notice('Search', warning);
                    });
                    break;
                case 'error':
                    notify.error('Search', response.message);
                    break;
            }
        });

        connection.onError(function() {
            error = true;
            clearInterval(pingWebSocket);
        });

        connection.onClose(function() {
            error = true;
            clearInterval(pingWebSocket);
        });

        function getFilters() {
        	var filters = {
        		textFilters: [],
        		sequenceFilters: []
        	};

        	filters.textFilters.push_array(filters_tcr.getFilters())
        	filters.textFilters.push_array(filters_mhc.getFilters())

        	return filters;
        }

		return {
			getFilters: getFilters
		}

	}]);

	application.factory('filters_v2_tcr', [function() {

		var general_tcr = {
			human: true,
			monkey: true,
			mouse: true,

			tra: true,
			trb: true
		}

		function getFilters() {
			var filters = [];

			filters.push_array(getGeneralFilters());

			return filters;
		}

		function getGeneralFilters() {

			var filters = []
			if (general_tcr.human == false) addSpeciesFilter(filters, true, 'HomoSapiens');
			if (general_tcr.monkey == false) addSpeciesFilter(filters, true, 'MacacaMulatta');
			if (general_tcr.mouse == false) addSpeciesFilter(filters, true, 'MusMusculus');

			if (general_tcr.tra == false) addGeneFilter(filters, true, 'TRA');
			if (general_tcr.trb == false) addGeneFilter(filters, true, 'TRB');

			return filters;
		}

		function addGeneFilter(filters, negative, value) {
			filters.push({
				columnId: 'gene',
				filterType: 'exact',
				negative: negative,
				value: value
			})
		}

		function addSpeciesFilter(filters, negative, value) {
			filters.push({
				columnId: 'species',
				filterType: 'exact', 
				negative: negative,
				value: value
			})
		}

		return {
			general_tcr: general_tcr,
			getFilters: getFilters
		}
	}]);

	application.directive('filtersTcr', function() {
		return {
			restrict: 'E',
			controller: ['$scope', 'filters_v2_tcr', function($scope, filters_tcr) {
				$scope.general_tcr = filters_tcr.general_tcr;
			}]
		}
	})


	application.factory('filters_v2_mhc', [function() {

		var general_mhc = {
			mhc1_class: true,
			mhc2_class: true
		};

		function getFilters() {
			var filters = [];

			filters.push_array(getGeneralFilters());

			return filters;
		}

		function getGeneralFilters() {

			var filters = []

			if (general_mhc.mhc1_class == false) addMHCGeneralFilter(filters, true, 'MHCI');
			if (general_mhc.mhc2_class == false) addMHCGeneralFilter(filters, true, 'MHCII');

			return filters;
		}

		function addMHCGeneralFilter(filters, negative, value) {
			filters.push({
				columnId: 'mhc.class',
				filterType: 'exact', 
				negative: negative,
				value: value
			})
		}

		return {
			general_mhc: general_mhc,
			getFilters: getFilters
		}
	}]);

	application.directive('filtersMhc', function() {
		return {
			restrict: 'E',
			controller: ['$scope', 'filters_v2_mhc', function($scope, filters_mhc) {
				$scope.general_mhc = filters_mhc.general_mhc;
			}]
		}
	})


}())