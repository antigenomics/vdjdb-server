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

// TCR

		var general_tcr = {
			human: true,
			monkey: true,
			mouse: true,

			tra: true,
			trb: true
		}

		var vSegment = {
			apply: false,
			value: ''
		}

		var jSegment = {
		    apply: false,
		    value: ''
        }

        var cdr3Pattern = {
            apply: false,
        	value: '',
        	substring: false
        }

        var cdr3Hamming = {
            apply: false,
        	value: '',
        	s: 0,
        	i: 0,
        	d: 0
        }

// AG

		var agSpecies = {
			apply: false,
			value: ''
		}

		var agGene = {
			apply: false,
			value: ''
		}

		var agSequence = {
			apply: false,
			value: ''
		}

        var agPattern = {
            apply: false,
        	value: '',
        	substring: false
        }

// MHC

		var mhcClass = {
			mhci: true,
			mhcii: true
		}

		var mhcA = {
			apply: false,
			value: ''
		}

		var mhcB = {
			apply: false,
			value: ''
		}

// META

		var pmIds = {
			apply: false,
			value: ''
		}

		var metaTags = {
			methodSort: true,
			methodCulture: true,
			methodOther: true,
			seqSanger: true,
			seqAmplicon: true,
			seqSingleCell: true,
			nonCanonical: false,
			unmapped: false
		}

		var minConfScore = {
			value: 0
		}

		function getFilters() {
			var filters = { textFilters = [], sequenceFilters = []}

			if (general_tcr.human == false) addExactFilter(filters, 'species', 'HomoSapiens');
			if (general_tcr.monkey == false) addExactFilter(filters, 'species', 'MacacaMulatta');
			if (general_tcr.mouse == false) addExactFilter(filters, 'species', 'MusMusculus');
			if (general_tcr.tra == false) addExactFilter(filters, 'gene', 'TRA');
			if (general_tcr.trb == false) addExactFilter(filters, 'gene', 'TRB');

			if (vSegment.apply == true) addCsTextFilter(filters, 'v.segm', vSegment.value);
			if (jSegment.apply == true) addCsTextFilter(filters, 'j.segm', jSegment.value);

			if (cdr3Pattern.apply == true) addSequencePatternFilter(filters, "cdr3", cdr3Pattern.substring, cdr3Pattern.value);
			if (cdr3Hamming.apply == true) addHammingFilter(filters, "cdr3", cdr3Hamming.s, cdr3Hamming.i, cdr3Hamming.d, cdr3Hamming.value);



			if (agSpecies.apply == true) addCsTextFilterExact(filters, 'antigen.species', agSpecies.value);
			if (agGene.apply == true) addCsTextFilterExact(filters, 'antigen.gene', agGene.value);

			if (agSequence.apply == true) addCsTextFilterExact(filters, 'antigen.epitope', agSequence.value);
			if (agPattern.apply == true) addSequencePatternFilter(filters, "antigen.epitope", agPattern.substring, agPattern.value);



			if (mhcClass.mhci == false) addExactFilter(filters, 'mhc.class', 'MHCI');
			if (mhcClass.mhcii == false) addExactFilter(filters, 'mhc.class', 'MHCII');

			if (mhcA.apply == true) addCsTextFilter(filters, 'mhc.a', mhcA.value);
			if (mhcB.apply == true) addCsTextFilter(filters, 'mhc.b', mhcB.value);



			if (pmIds.apply == true) addCsTextFilterExact(filters, 'reference.id', pmIds.value);

			if (metaTags.methodSort == false) addExactFilter(filters, 'web.method', 'sort');
			if (metaTags.methodCulture == false) addExactFilter(filters, 'web.method', 'culture');
			if (metaTags.methodOther == false) addExactFilter(filters, 'web.method', 'other');

			if (metaTags.seqSanger == false) addExactFilter(filters, 'web.method.seq', 'sanger');
			if (metaTags.seqAmplicon == false) addExactFilter(filters, 'web.method.seq', 'amplicon');
			if (metaTags.seqSingleCell == false) addExactFilter(filters, 'web.method.seq', 'singlecell');

			if (metaTags.nonCanonical == false) addExactFilter(filters, 'web.cdr3fix.nc', 'yes');
			if (metaTags.unmapped == false) addExactFilter(filters, 'web.cdr3fix.unmp', 'yes');

			if (minConfScore.value > 0) addScoreFilter(filters, minConfScore.value);

			return filters;
		}

// Filter types

		function addExactFilter(filters, column, value) {
			filters.textFilters.push({
				columnId: column,
				filterType: 'exact',
				negative: true,
				value: value
			})
		}

		function addCsTextFilter(filters, column, value) {
            filters.textFilters.push({
                columnId: column,
                filterType: 'substring_set',
				negative: false,
                value: value
            })
        }

		function addCsTextFilterExact(filters, column, value) {
		    filters.textFilters.push({
		        columnId: column,
		        filterType: 'exact_set',
				negative: false,
		        value: value
		    })
        }

        function addSequencePatternFilter(filters, column, substring, value) {
            filters.textFilters.push({
                columnId: column,
                filterType: 'pattern',
                negative: false,
                value: groomSequencePattern(substring, value)
            })
        }

        function groomSequencePattern(substring, value) {
            if (substring == false) value = '^' + value + '$'
            return value.replace(/X/g, ".")
        }

        function addHammingFilter(filters, column, s, i, d, value) {
            filters.sequenceFilters.push({
                columnId: column,
                mutations: s,
                insertions: i,
                deletions: d,
                mismatches: s + i + d,
                query: value
            })
        }

		function addScoreFilter(filters, value) {
		    filters.push({
		        columnId: 'vdjdb.score',
		        filterType: 'level',
		        negative: false,
		        value: value
		    })
        }


		return {
			general_tcr: general_tcr,
			vSegment: vSegment,
			jSegment: jSegment,
			cdr3Pattern: cdr3Pattern,
			cdr3Hamming: cdr3Hamming,
			agSpecies: agSpecies,
			agGene: agGene,
			agSequence: agSequence,
			agPattern: agPattern,
			mhcClass: mhcClass,
			mhcA: mhcA,
			mhcB: mhcB,
			pmIds: pmIds,
			metaTags: metaTags,
			minConfScore: minConfScore,
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