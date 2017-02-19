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

		var textFiltersColumns = [];
        var sequenceFiltersColumns = [];

        var textFiltersTypes = Object.freeze([
            { name: 'substring', title: 'Substring match', allowNegative: true, description: 'substring' },
            { name: 'exact', title: 'Full match', allowNegative: true, description: 'exact' },
            { name: 'level', title: 'Greater or equals', allowNegative: true, description: 'level' },
            { name: 'frequency', title: 'Greater or equals', allowNegative: false, description: 'frequency' },
            { name: 'identification', title: 'Tags and keywords', allowNegative: false, description: 'identification' },
            { name: 'json', title: 'Tags and keywords', allowNegative: false, description: 'json' }  
        ]);

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
                        	initialize(response.columns);
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

        function initialize(columns) {

        	var text = [];
        	var seq = [];

            angular.forEach(columns, function(column) {
                var meta = column.metadata;
                if (meta.searchable === '1') {
                    if (meta.columnType === 'txt') {
                        text.push({
                            name: column.name,
                            title: meta.title,
                            types: (function() {
                                if (meta.title === 'Gene') {
                                    return [1];
                                }
                                if (meta.dataType === 'uint')
                                    return [2];
                                return [0, 1]
                            }()),
                            allowNegative: (function() {
                                return meta.dataType !== 'uint';
                            }()),
                            autocomplete: column.autocomplete,
                            values: column.values,
                            defaultFilterType: (function() {
                                if (meta.dataType === 'uint')
                                    return textFiltersTypes[2];
                                return textFiltersTypes[1];
                            }())
                        })
                    } else if (meta.columnType === 'seq') {
                        text.push({
                            name: column.name,
                            title: meta.title,
                            types: [0, 1],
                            allowNegative: true,
                            autocomplete: false,
                            values: [],
                            defaultFilterType: textFiltersTypes[1]
                        });
                        seq.push({
                            name: column.name,
                            title: meta.title,
                            types: [0, 1],
                            allowNegative: true,
                            autocomplete: false,
                            values: []
                        })
                    }
                }
            });
            text.push({
                name: 'meta',
                title: 'Meta',
                types: [5],
                allowNegative: false,
                autocomplete: false,
                values: [],
                defaultFilterType: textFiltersTypes[5]
            });
            text.push({
                name: 'method',
                title: 'Frequency',
                types: [3],
                allowNegative: false,
                autocomplete: false,
                values: [],
                defaultFilterType: textFiltersTypes[3]
            });
            text.push({
                name: 'method',
                title: 'Method',
                types: [4],
                allowNegative: false,
                autocomplete: false,
                values: [],
                defaultFilterType: textFiltersTypes[4]
            })
            columnsLoading = false;

            //just for angular digest cycle todo
            angular.extend(textFiltersColumns, text);
            angular.extend(sequenceFiltersColumns, seq);
        }

		return {
			getFilters: getFilters,
			textFiltersColumns: textFiltersColumns,
			sequenceFiltersColumns: sequenceFiltersColumns
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

		var germline_tcr = {
			variable: '',
			joining: ''
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
			controller: ['$scope', 'filters_v2', 'filters_v2_tcr', function($scope, filters, filters_tcr) {
				$scope.general_tcr = filters_tcr.general_tcr;

				$scope.textColumns = filters.textFiltersColumns;

				$scope.appendVSegment = appendVSegment;
				$scope.vSegment = {
					apply: false, 
					autocomplete: [],
					value: ''
				};

				$scope.appendJSegment = appendJSegment;
				$scope.jSegment = {
					apply: false,
					autocomplete: [],
					value: ''
				}

				var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
					if (filters.textFiltersColumns.length != 0) {
						findAutocompleteValues($scope.vSegment.autocomplete, $scope.jSegment.autocomplete, filters.textFiltersColumns);
						console.log(filters.textFiltersColumns);
						console.log($scope.jSegment.autocomplete);
						textColumnsWatcher();
					}
				})

				function findAutocompleteValues(vAutocomplete, jAutocomplete, columns) {
					angular.forEach(columns, function(column) {
						if (column.name == 'v.segm') angular.extend(vAutocomplete, column.values);
						if (column.name == 'j.segm') angular.extend(jAutocomplete, column.values);
					})
				}

				function appendVSegment(value) {
					var v = $scope.vSegment.value.split(',');
					v[v.length - 1] = value;
					$scope.vSegment.value = v.join(",");
				}

				function appendJSegment(value) {
					var j = $scope.jSegment.value.split(',');
					j[j.length - 1] = value;
					$scope.jSegment.value = j.join(',');
				}
			}]
		}
	})

	application.filter('filterSubstringComma', function() {
        return function(data, value) {
        	//trim
        	var commaValue = value.replace(/\s/g, ""); 
        	if (value.indexOf(',') !== -1) {
        		var values = commaValue.split(',');
        		commaValue = values[values.length - 1];
        		console.log(commaValue);
        	}

            if (data instanceof Array) {
                return data.filter(function(item) {
                    return item.indexOf(commaValue) !== -1;
                })
            } else {
                return []
            }
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