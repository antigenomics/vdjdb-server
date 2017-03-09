(function() {
    "use strict";
    Array.prototype.push_array = function(array) {
        this.push.apply(this, array);
    };

    $(document).ready(function(){
        $('[data-toggle="tooltip"]').tooltip({html: true});
    });

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

                filters_tcr.updateFilters(filters);
                filters_mhc.updateFilters(filters);
                filters_ag.updateFilters(filters);
                filters_meta.updateFilters(filters);

                return filters;
            }

            function initialize(columns) {
                var text = [];

                angular.forEach(columns, function(column) {
                    text.push({
                        name: column.name,
                        values: column.values
                    })
                });

                columnsLoading = false;

                angular.extend(textFiltersColumns, text);
            }

            function resetFilters() {
                filters_tcr.resetFilters();
                filters_mhc.resetFilters();
                filters_ag.resetFilters();
                filters_meta.resetFilters();
            }

            return {
                getFilters: getFilters,
                resetFilters: resetFilters,
                textFiltersColumns: textFiltersColumns
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
        filters.textFilters.push({
            columnId: 'vdjdb.score',
            filterType: 'level',
            negative: false,
            value: value.toString()
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
        };

        var v_segment = {
            autocomplete: [ ],
            value: ''
        };

        var j_segment = {
            autocomplete: [ ],
            value: ''
        };

        var cdr3_pattern = {
            value: '',
            substring: false
        };

        var cdr3_hamming = {
            value: '',
            s: 0,
            i: 0,
            d: 0
        };

        function resetFilters() {
            general_tcr.human = true;
            general_tcr.monkey = true;
            general_tcr.mouse = true;
            general_tcr.tra = true;
            general_tcr.trb = true;
            v_segment.value = '';
            j_segment.value = '';
            cdr3_pattern.value = '';
            cdr3_pattern.substring = false;
            cdr3_hamming.value = '';
            cdr3_hamming.s = 0;
            cdr3_hamming.i = 0;
            cdr3_hamming.d = 0;
        }

        function updateFilters(filters) {
            if (general_tcr.human == false) addExactFilter(filters, 'species', 'HomoSapiens');
            if (general_tcr.monkey == false) addExactFilter(filters, 'species', 'MacacaMulatta');
            if (general_tcr.mouse == false) addExactFilter(filters, 'species', 'MusMusculus');
            if (general_tcr.tra == false) addExactFilter(filters, 'gene', 'TRA');
            if (general_tcr.trb == false) addExactFilter(filters, 'gene', 'TRB');

            if (v_segment.value.length > 0) addCsTextFilter(filters, 'v.segm', v_segment.value);
            if (j_segment.value.length > 0) addCsTextFilter(filters, 'j.segm', j_segment.value);

            if (cdr3_pattern.value.length > 0) addSequencePatternFilter(filters, "cdr3", cdr3_pattern.substring, cdr3_pattern.value);
            if (cdr3_hamming.value.length > 0) addHammingFilter(filters, "cdr3", cdr3_hamming.s, cdr3_hamming.i, cdr3_hamming.d, cdr3_hamming.value);
        }

        return {
            general_tcr: general_tcr,
            v_segment: v_segment,
            j_segment: j_segment,
            cdr3_pattern: cdr3_pattern,
            cdr3_hamming: cdr3_hamming,
            updateFilters: updateFilters,
            resetFilters: resetFilters
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
                        textColumnsWatcher();
                    }
                });

                function findAutocompleteValues(vAutocomplete, jAutocomplete, columns) {
                    angular.forEach(columns, function(column) {
                        if (column.name == 'v.segm') angular.extend(vAutocomplete, column.values.sort());
                        if (column.name == 'j.segm') angular.extend(jAutocomplete, column.values.sort());
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

                $scope.incrementS = function() {
                    $scope.cdr3_hamming.s++;
                };
                $scope.decrementS = function() {
                    $scope.cdr3_hamming.s--;
                };
                $scope.incrementI = function() {
                    $scope.cdr3_hamming.i++;
                };
                $scope.decrementI = function() {
                    $scope.cdr3_hamming.i--;
                };
                $scope.incrementD = function() {
                    $scope.cdr3_hamming.d++;
                };
                $scope.decrementD = function() {
                    $scope.cdr3_hamming.d--;
                };
            }]
        }
    });

    application.filter('filterSubstringComma', function() {
        return function(data, value) {
            //trim
            var commaValue = value.replace(/\s/g, "");
            if (value.indexOf(',') !== -1) {
                var values = commaValue.split(',');
                commaValue = values[values.length - 1];
            }

            if (data instanceof Array) {
                return data.filter(function(item) {
                    return item.indexOf(commaValue) !== -1;
                })
            } else {
                return []
            }
        }
    });

//////////////// ANTIGEN

    application.factory('filters_v2_ag', [function() {
        var ag_species = {
            autocomplete: [ ],
            value: ''
        };

        var ag_gene = {
            autocomplete: [ ],
            value: ''
        };

        var ag_sequence = {
            autocomplete: [ ],
            value: ''
        };

        var ag_pattern = {
            value: '',
            substring: false
        };

        function resetFilters() {
            ag_species.value = '';
            ag_gene.value = '';
            ag_sequence = '';
            ag_pattern = '';
        }

        function updateFilters(filters) {
            if (ag_species.value.length > 0) addCsTextFilterExact(filters, 'antigen.species', ag_species.value);
            if (ag_gene.value.length > 0) addCsTextFilterExact(filters, 'antigen.gene', ag_gene.value);

            if (ag_sequence.value.length > 0) addCsTextFilterExact(filters, 'antigen.epitope', ag_sequence.value);
            if (ag_pattern.value.length > 0) addSequencePatternFilter(filters, "antigen.epitope", ag_pattern.substring, ag_pattern.value);
        }

        return {
            ag_species: ag_species,
            ag_gene: ag_gene,
            ag_sequence: ag_sequence,
            ag_pattern: ag_pattern,
            updateFilters: updateFilters,
            resetFilters: resetFilters
        }
    }]);

    application.directive('filtersAg', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters_v2', 'filters_v2_ag', function($scope, filters, filters_ag) {
                $scope.ag_species = filters_ag.ag_species;
                $scope.ag_gene = filters_ag.ag_gene;
                $scope.ag_sequence = filters_ag.ag_sequence;
                $scope.ag_pattern = filters_ag.ag_pattern;

                $scope.appendAgSpecies = appendAgSpecies;
                $scope.appendAgGene = appendAgGene;
                $scope.appendAgSequence = appendAgSequence;

                var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
                    if (filters.textFiltersColumns.length != 0) {
                        findAutocompleteValues($scope.ag_species.autocomplete, $scope.ag_gene.autocomplete, $scope.ag_sequence.autocomplete, filters.textFiltersColumns);
                        textColumnsWatcher();
                    }
                });

                function findAutocompleteValues(agSpeciesAutocomplete, agGeneAutocomplete, agSequenceAutocomplete, columns) {
                    angular.forEach(columns, function(column) {
                        if (column.name == 'antigen.species') angular.extend(agSpeciesAutocomplete, column.values.sort());
                        if (column.name == 'antigen.gene') angular.extend(agGeneAutocomplete, column.values.sort());
                        if (column.name == 'antigen.epitope') angular.extend(agSequenceAutocomplete, column.values.sort());
                    })
                }

                function appendAgSpecies(value) {
                    var x = $scope.ag_species.value.split(',');
                    x[x.length - 1] = value;
                    $scope.ag_species.value = x.join(",");
                }

                function appendAgGene(value) {
                    var x = $scope.ag_gene.value.split(',');
                    x[x.length - 1] = value;
                    $scope.ag_gene.value = x.join(",");
                }

                function appendAgSequence(value) {
                    var x = $scope.ag_sequence.value.split(',');
                    x[x.length - 1] = value;
                    $scope.ag_sequence.value = x.join(",");
                }
            }]
        }
    });

//////////////// MHC

    application.factory('filters_v2_mhc', [function() {
        var mhc_class = {
            mhci: true,
            mhcii: true
        };

        var mhc_a = {
            autocomplete: [ ],
            value: ''
        };

        var mhc_b = {
            autocomplete: [ ],
            value: ''
        };

        function resetFilters() {
            mhc_class.mhci = true;
            mhc_class.mhcii = true;
            mhc_a.value = '';
            mhc_b.value = '';
        }

        function updateFilters(filters) {
            if (mhc_class.mhci == false) addExactFilter(filters, 'mhc.class', 'MHCI');
            if (mhc_class.mhcii == false) addExactFilter(filters, 'mhc.class', 'MHCII');

            if (mhc_a.value.length > 0) addCsTextFilter(filters, 'mhc.a', mhc_a.value);
            if (mhc_b.value.length > 0) addCsTextFilter(filters, 'mhc.b', mhc_b.value);
        }

        return {
            mhc_class: mhc_class,
            mhc_a: mhc_a,
            mhc_b: mhc_b,
            updateFilters: updateFilters,
            resetFilters: resetFilters
        }
    }]);

    application.directive('filtersMhc', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters_v2', 'filters_v2_mhc', function($scope, filters, filters_mhc) {
                $scope.mhc_class = filters_mhc.mhc_class;
                $scope.mhc_a = filters_mhc.mhc_a;
                $scope.mhc_b = filters_mhc.mhc_b;

                $scope.appendMhcA = appendMhcA;
                $scope.appendMhcB = appendMhcB;

                var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
                    if (filters.textFiltersColumns.length != 0) {
                        findAutocompleteValues($scope.mhc_a.autocomplete, $scope.mhc_b.autocomplete, filters.textFiltersColumns);
                        textColumnsWatcher();
                    }
                });

                function findAutocompleteValues(mhcAAutocomplete, mhcBAutocomplete, columns) {
                    angular.forEach(columns, function(column) {
                        if (column.name == 'mhc.a') angular.extend(mhcAAutocomplete, column.values.sort());
                        if (column.name == 'mhc.b') angular.extend(mhcBAutocomplete, column.values.sort());
                    })
                }

                function appendMhcA(value) {
                    var x = $scope.mhc_a.value.split(',');
                    x[x.length - 1] = value;
                    $scope.mhc_a.value = x.join(",");
                }

                function appendMhcB(value) {
                    var x = $scope.mhc_b.value.split(',');
                    x[x.length - 1] = value;
                    $scope.mhc_b.value = x.join(",");
                }
            }]
        }
    });

//////////////// META

    application.factory('filters_v2_meta', [function() {
        var pm_ids = {
            autocomplete: [],
            value: ''
        };

        var meta_tags = {
            methodSort: true,
            methodCulture: true,
            methodOther: true,
            seqSanger: true,
            seqAmplicon: true,
            seqSingleCell: true,
            nonCanonical: false,
            unmapped: false
        };

        var min_conf_score = {
            value: 0
        };

        function resetFilters() {
            pm_ids.value = '';
            meta_tags.methodSort = true;
            meta_tags.methodCulture = true;
            meta_tags.methodOther = true;
            meta_tags.seqSanger = true;
            meta_tags.seqAmplicon = true;
            meta_tags.seqSingleCell = true;
            meta_tags.nonCanonical = false;
            meta_tags.unmapped = false;
        }

        function updateFilters(filters) {
            if (pm_ids.value.length > 0) addCsTextFilterExact(filters, 'reference.id', pm_ids.value);

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
            updateFilters: updateFilters,
            resetFilters: resetFilters
        }
    }]);

    application.directive('filtersMeta', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters_v2', 'filters_v2_meta', function($scope, filters, filters_meta) {
                $scope.pm_ids = filters_meta.pm_ids;
                $scope.meta_tags = filters_meta.meta_tags;
                $scope.min_conf_score = filters_meta.min_conf_score;

                $scope.appendPmId = appendPmId;

                var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
                    if (filters.textFiltersColumns.length != 0) {
                        findAutocompleteValues($scope.pm_ids.autocomplete, filters.textFiltersColumns);
                        textColumnsWatcher();
                    }
                });

                function findAutocompleteValues(pmIdsAutocomplete, columns) {
                    angular.forEach(columns, function(column) {
                        if (column.name == 'reference.id') angular.extend(pmIdsAutocomplete, column.values.sort());
                    })
                }

                function appendPmId(value) {
                    var x = $scope.pm_ids.value.split(',');
                    x[x.length - 1] = value;
                    $scope.pm_ids.value = x.join(",");
                }

                $scope.incrementScore = function() {
                    $scope.min_conf_score.value++;
                };
                $scope.decrementScore = function() {
                    $scope.min_conf_score.value--;
                };
            }]
        }
    })
}());