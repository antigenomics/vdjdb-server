(function() {
	"use strict";
	Array.prototype.push_array = function(array) {
		this.push.apply(this, array);
	}


	var application = angular.module('filters_v2', ['ngWebSocket', 'table', 'notifications']);

	application.factory('filters_v2', ['$websocket', 'table', 'notify',
	'filters_v2_tcr', 'filters_v2_mhc', 'filters_v2_ag', 'filters_v2_meta',
	function ($websocket, table, notify, filters_tcr, filters_mhc, filters_ag, filters_meta) {

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

            filters_tcr.updateFilters(filters)
            filters_mhc.updateFilters(filters)
            filters_ag.updateFilters(filters)
            filters_meta.updateFilters(filters)

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

    // End filter types


//////////////// TCR

    application.factory('filters_v2_tcr', [function() {
        var general_tcr = {
            human: true,
            monkey: true,
            mouse: true,
            tra: true,
            trb: true
        }

        var v_segment = {
            apply: false,
            autocomplete: [ ],
            value: ''
        }

        var j_segment = {
            apply: false,
            autocomplete: [ ],
            value: ''
        }

        var cdr3_pattern = {
            apply: false,
            value: '',
            substring: false
        }

        var cdr3_hamming = {
            apply: false,
            value: '',
            s: 0,
            i: 0,
            d: 0
        }

        function updateFilters(filters) {
            if (general_tcr.human == false) addExactFilter(filters, 'species', 'HomoSapiens');
            if (general_tcr.monkey == false) addExactFilter(filters, 'species', 'MacacaMulatta');
            if (general_tcr.mouse == false) addExactFilter(filters, 'species', 'MusMusculus');
            if (general_tcr.tra == false) addExactFilter(filters, 'gene', 'TRA');
            if (general_tcr.trb == false) addExactFilter(filters, 'gene', 'TRB');

            if (v_segment.apply == true) addCsTextFilter(filters, 'v.segm', v_segment.value);
            if (j_segment.apply == true) addCsTextFilter(filters, 'j.segm', j_segment.value);

            if (cdr3_pattern.apply == true) addSequencePatternFilter(filters, "cdr3", cdr3_pattern.substring, cdr3_pattern.value);
            if (cdr3_hamming.apply == true) addHammingFilter(filters, "cdr3", cdr3_hamming.s, cdr3_hamming.i, cdr3_hamming.d, cdr3_hamming.value);
        }

        return {
            general_tcr: general_tcr,
            v_segment: v_segment,
            j_segment: j_segment,
            cdr3_pattern: cdr3_pattern,
            cdr3_hamming: cdr3_hamming,
            updateFilters: updateFilters
        }
    }]);

	application.directive('filtersTcr', function() {
		return {
			restrict: 'E',
			controller: ['$scope', 'filters_v2', 'filters_v2_tcr', function($scope, filters, filters_tcr) {
				$scope.textColumns = filters.textFiltersColumns;

				$scope.general_tcr = filters_tcr.general_tcr;

				$scope.v_segment = filters_tcr.v_segment;
				$scope.j_segment = filters_tcr.j_segment;
				$scope.cdr3_pattern = filters_tcr.cdr3_pattern;
				$scope.cdr3_hamming = filters_tcr.cdr3_hamming;

				$scope.appendVSegment = appendVSegment;
				$scope.appendJSegment = appendJSegment;

				var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
					if (filters.textFiltersColumns.length != 0) {
						findAutocompleteValues($scope.v_segment.autocomplete, $scope.j_segment.autocomplete, filters.textFiltersColumns);
						console.log(filters.textFiltersColumns);
						console.log($scope.j_segment.autocomplete);
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
					var v = $scope.v_segment.value.split(',');
					v[v.length - 1] = value;
					$scope.v_segment.value = v.join(",");
				}

				function appendJSegment(value) {
					var j = $scope.j_segment.value.split(',');
					j[j.length - 1] = value;
					$scope.j_segment.value = j.join(',');
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

//////////////// ANTIGEN

	application.factory('filters_v2_ag', [function() {
        var ag_species = {
			apply: false,
			value: ''
		}

		var ag_gene = {
			apply: false,
			value: ''
		}

		var ag_sequence = {
			apply: false,
			value: ''
		}

        var ag_pattern = {
            apply: false,
        	value: '',
        	substring: false
        }

        function updateFilters(filters) {
			if (ag_species.apply == true) addCsTextFilterExact(filters, 'antigen.species', ag_species.value);
			if (ag_gene.apply == true) addCsTextFilterExact(filters, 'antigen.gene', ag_gene.value);

			if (ag_sequence.apply == true) addCsTextFilterExact(filters, 'antigen.epitope', ag_sequence.value);
			if (ag_pattern.apply == true) addSequencePatternFilter(filters, "antigen.epitope", ag_pattern.substring, agPattern.value);
        }

        return {
            ag_species: ag_species,
            ag_gene: ag_gene,
            ag_sequence: ag_sequence,
            ag_pattern: ag_pattern,
            updateFilters: updateFilters
        }
	}]);

	application.directive('filtersAg', function() {
		return {
			restrict: 'E',
			controller: ['$scope', 'filters_v2_ag', function($scope, filters_ag) {
				$scope.ag_species = filters_ag.ag_species;
				$scope.ag_gene = filters_ag.ag_gene;
				$scope.ag_sequence = filters_ag.ag_sequence;
				$scope.ag_pattern = filters_ag.ag_pattern;
			}]
		}
	});

//////////////// MHC

	application.factory('filters_v2_mhc', [function() {
		var mhc_class = {
			mhci: true,
			mhcii: true
		}

		var mhc_a = {
			apply: false,
			value: ''
		}

		var mhc_b = {
			apply: false,
			value: ''
		}

        function updateFilters(filters) {
			if (mhc_class.mhci == false) addExactFilter(filters, 'mhc.class', 'MHCI');
			if (mhc_class.mhcii == false) addExactFilter(filters, 'mhc.class', 'MHCII');

			if (mhc_a.apply == true) addCsTextFilter(filters, 'mhc.a', mhc_a.value);
			if (mhc_b.apply == true) addCsTextFilter(filters, 'mhc.b', mhc_b.value);
        }

        return {
            mhc_class: mhc_class,
            mhc_a: mhc_a,
            mhc_b: mhc_b,
            updateFilters: updateFilters
        }
	}]);

	application.directive('filtersMhc', function() {
		return {
			restrict: 'E',
			controller: ['$scope', 'filters_v2_mhc', function($scope, filters_mhc) {
				$scope.mhc_class = filters_mhc.mhc_class;
				$scope.mhc_a = filters_mhc.mhc_a;
				$scope.mhc_b = filters_mhc.mhc_b;
			}]
		}
	})

//////////////// META

	application.factory('filters_v2_meta', [function() {
		var pm_ids = {
			apply: false,
			value: ''
		}

		var meta_tags = {
			methodSort: true,
			methodCulture: true,
			methodOther: true,
			seqSanger: true,
			seqAmplicon: true,
			seqSingleCell: true,
			nonCanonical: false,
			unmapped: false
		}

		var min_conf_score = {
			value: 0
		}

        function updateFilters(filters) {
			if (pm_ids.apply == true) addCsTextFilterExact(filters, 'reference.id', pmIds.value);

			if (meta_tags.methodSort == false) addExactFilter(filters, 'web.method', 'sort');
			if (meta_tags.methodCulture == false) addExactFilter(filters, 'web.method', 'culture');
			if (meta_tags.methodOther == false) addExactFilter(filters, 'web.method', 'other');

			if (meta_tags.seqSanger == false) addExactFilter(filters, 'web.method.seq', 'sanger');
			if (meta_tags.seqAmplicon == false) addExactFilter(filters, 'web.method.seq', 'amplicon');
			if (meta_tags.seqSingleCell == false) addExactFilter(filters, 'web.method.seq', 'singlecell');

			if (meta_tags.nonCanonical == false) addExactFilter(filters, 'web.cdr3fix.nc', 'yes');
			if (meta_tags.unmapped == false) addExactFilter(filters, 'web.cdr3fix.unmp', 'yes');

			if (min_conf_score.value > 0) addScoreFilter(filters, min_conf_score.value);
        }

        return {
            pm_ids: pm_ids,
            meta_tags: meta_tags,
            min_conf_score: min_conf_score,
            updateFilters: updateFilters
        }
	}]);

	application.directive('filtersMeta', function() {
		return {
			restrict: 'E',
			controller: ['$scope', 'filters_v2_meta', function($scope, filters_meta) {
				$scope.pm_ids = filters_meta.pm_ids;
				$scope.meta_tags = filters_meta.meta_tags;
				$scope.min_conf_score = filters_meta.min_conf_score;
			}]
		}
	})
}())