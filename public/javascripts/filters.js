(function() {
    "use strict";
    $(document).ready(function(){
        $('[data-toggle="tooltip"]').tooltip({html: true});
    });

    var application = angular.module('filters', ['ngWebSocket', 'table', 'notifications']);

    application.factory('filters', ['$websocket', 'table', 'notify',
        'filters_tcr', 'filters_mhc', 'filters_ag', 'filters_meta',
        function ($websocket, table, notify, filters_tcr, filters_mhc, filters_ag, filters_meta) {

            var columnsLoading = true;
            var error = false;

            var connection = $websocket('ws://' + location.host + '/filters/connect');
            var pingWebSocket = null;

            var columns = [];

            connection.onOpen(function() {
                connection.send({
                    action: 'columns',
                    data: {}
                });
                connection.send({
                    action: 'suggestions.epitope',
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
                switch (response.status) {
                    case 'success':
                        switch (response.action) {
                            case 'columns':
                                initialize(response.columns);
                                table.setColumns(response.columns);
                                columnsLoading = false;
                                break;
                            case 'suggestions.epitope':
                                filters_ag.updateEpitopeSuggestions(response.suggestions);
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

            function setOptions(options) {
                angular.forEach(options.filters_tcr, function(option) {
                    filters_tcr.setOptions(option.name, option.value);
                });
                angular.forEach(options.filters_ag, function(option) {
                    filters_ag.setOptions(option.name, option.value);
                });
                angular.forEach(options.filters_mhc, function(option) {
                    filters_mhc.setOptions(option.name, option.value);
                });
                angular.forEach(options.filters_meta, function(option) {
                    filters_meta.setOptions(option.name, option.value);
                });
            }

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

            function initialize(new_columns) {
                var tmp = [];

                angular.forEach(new_columns, function(column) {
                    tmp.push({
                        name: column.name,
                        values: column.values
                    })
                });

                columnsLoading = false;

                angular.extend(columns, tmp);
            }

            function resetFilters() {
                filters_tcr.resetFilters();
                filters_mhc.resetFilters();
                filters_ag.resetFilters();
                filters_meta.resetFilters();
            }

            function isValid() {
                return filters_ag.isAntigenSequenceValid() && filters_tcr.isSequencePatternValid() && filters_tcr.isHammingPatternValid();
            }

            function getErrors() {
                var errors = [];
                if (!filters_ag.isAntigenSequenceValid()) {
                    errors.push('Invalid antigen sequence pattern')
                }
                if (!filters_tcr.isSequencePatternValid()) {
                    errors.push('Invalid cdr3 sequence pattern')
                }
                if (!filters_tcr.isHammingPatternValid()) {
                    errors.push('Invalid hamming query')
                }
                return errors;
            }

            return {
                setOptions: setOptions,
                getFilters: getFilters,
                resetFilters: resetFilters,
                columns: columns,
                isValid: isValid,
                getErrors: getErrors
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
            substitutions: s,
            insertions: i,
            deletions: d,
            total: s + i + d,
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

    application.factory('filters_tcr', [function() {
        var options = {
            species_option: false,
            chain_option: false,
            collapse: true,
            block: true,
            general_tcr: true,
            germline: true,
            cdr3: true
        };

        var general_tcr = {
            human: true,
            monkey: true,
            mouse: true,
            tra: false,
            trb: true,
            paired_only: false
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
            valid: true,
            substring: false
        };

        var cdr3_hamming = {
            value: '',
            valid: true,
            s: 0,
            i: 0,
            d: 0
        };

        function setOptions(name, value) {
            options[name] = value;
            if (name === 'species_option') checkOption('species', 'human');
            if (name === 'chain_option') checkOption('chain', 'trb');
        }

        function resetFilters() {
            general_tcr.human = true;
            general_tcr.monkey = true;
            general_tcr.mouse = true;
            if (visibility.chain_option) {
                general_tcr.monkey = false;
                general_tcr.mouse = false;
            }
            general_tcr.tra = false;
            general_tcr.trb = true;
            general_tcr.paired_only = false;
            v_segment.value = '';
            j_segment.value = '';
            cdr3_pattern.value = '';
            cdr3_pattern.substring = false;
            cdr3_hamming.value = '';
            cdr3_hamming.s = 0;
            cdr3_hamming.i = 0;
            cdr3_hamming.d = 0;
        }

        function checkSequencePattern() {
            cdr3_pattern.value =  cdr3_pattern.value.toUpperCase();

            var leftBracketStart = false;
            var error = false;

            if (cdr3_pattern.value.length > 100) {
                cdr3_pattern.valid = false;
                return;
            }

            var allowed_chars = 'ARNDCQEGHILKMFPSTWYV';

            for (var i = 0; i < cdr3_pattern.value.length; i++) {
                var char = cdr3_pattern.value[i];
                if (char === '[') {
                    if (leftBracketStart === true) {
                        error = true;
                        break
                    }
                    leftBracketStart = true
                } else if (char === ']') {
                    if (leftBracketStart === false) {
                        error = true;
                        break;
                    } else if (cdr3_pattern.value[i - 1] === '[') {
                        error = true;
                        break;
                    }
                    leftBracketStart = false;
                } else {
                    if (char != 'X' && allowed_chars.indexOf(char) === -1 || char == ' ') {
                        error = true;
                        break;
                    }
                }
            }

            cdr3_pattern.valid =  !(leftBracketStart || error);
        }

        function checkHamming() {
            cdr3_hamming.value =  cdr3_hamming.value.toUpperCase();

            if (cdr3_hamming.value.length > 50) {
                cdr3_hamming.valid = false;
                return;
            }

            var allowed_chars = 'ARNDCQEGHILKMFPSTWYV';

            for (var i = 0; i < cdr3_hamming.value.length; i++) {
                var char = cdr3_hamming.value[i];
                if (allowed_chars.indexOf(char) === -1 || char === ' ') {
                    cdr3_hamming.valid = false;
                    return;
                }
            }
            cdr3_hamming.valid = true;
        }

        function isSequencePatternValid() {
            return cdr3_pattern.valid;
        }

        function isHammingPatternValid() {
            return cdr3_hamming.valid;
        }

        function updateFilters(filters) {
            if (general_tcr.human === false) addExactFilter(filters, 'species', 'HomoSapiens');
            if (general_tcr.monkey === false) addExactFilter(filters, 'species', 'MacacaMulatta');
            if (general_tcr.mouse === false) addExactFilter(filters, 'species', 'MusMusculus');
            if (general_tcr.tra === false) addExactFilter(filters, 'gene', 'TRA');
            if (general_tcr.trb === false) addExactFilter(filters, 'gene', 'TRB');
            if (general_tcr.paired_only === true) addExactFilter(filters, 'complex.id', '0');

            if (v_segment.value.length > 0) addCsTextFilter(filters, 'v.segm', v_segment.value);
            if (j_segment.value.length > 0) addCsTextFilter(filters, 'j.segm', j_segment.value);

            if (cdr3_pattern.value.length > 0) addSequencePatternFilter(filters, "cdr3", cdr3_pattern.substring, cdr3_pattern.value);
            if (cdr3_hamming.value.length > 0) addHammingFilter(filters, "cdr3", cdr3_hamming.s, cdr3_hamming.i, cdr3_hamming.d, cdr3_hamming.value);
        }

        function checkOption(option, value) {
            if (options.species_option) {
                if (option === 'species') {
                    general_tcr.mouse = false;
                    general_tcr.human = false;
                    general_tcr.monkey = false;
                    general_tcr[value] = true;
                } else if (option === 'chain') {
                    general_tcr.tra = false;
                    general_tcr.trb = false;
                    general_tcr[value] = true;
                }
            }
        }

        return {
            general_tcr: general_tcr,
            v_segment: v_segment,
            j_segment: j_segment,
            cdr3_pattern: cdr3_pattern,
            cdr3_hamming: cdr3_hamming,
            options: options,
            setOptions: setOptions,
            updateFilters: updateFilters,
            resetFilters: resetFilters,
            checkSequencePattern: checkSequencePattern,
            checkHamming: checkHamming,
            isSequencePatternValid: isSequencePatternValid,
            isHammingPatternValid: isHammingPatternValid,
            checkOption: checkOption
        }
    }]);

    application.directive('filtersTcr', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', 'filters_tcr', function($scope, filters, filters_tcr) {
                $scope.textColumns = filters.columns;

                $scope.tcr_options = filters_tcr.options;
                $scope.general_tcr = filters_tcr.general_tcr;
                $scope.v_segment = filters_tcr.v_segment;
                $scope.j_segment = filters_tcr.j_segment;
                $scope.cdr3_pattern = filters_tcr.cdr3_pattern;
                $scope.cdr3_hamming = filters_tcr.cdr3_hamming;

                $scope.appendVSegment = appendVSegment;
                $scope.appendJSegment = appendJSegment;

                $scope.checkSequencePattern = filters_tcr.checkSequencePattern;
                $scope.isSequencePatternValid = filters_tcr.isSequencePatternValid;
                $scope.checkHamming = filters_tcr.checkHamming;
                $scope.isHammingPatternValid = filters_tcr.isHammingPatternValid;
                $scope.checkOption = filters_tcr.checkOption;


                var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
                    if (filters.columns.length !== 0) {
                        findAutocompleteValues($scope.v_segment.autocomplete, $scope.j_segment.autocomplete, filters.columns);
                        textColumnsWatcher();
                    }
                });

                function findAutocompleteValues(vAutocomplete, jAutocomplete, columns) {
                    angular.forEach(columns, function(column) {
                        if (column.name === 'v.segm') angular.extend(vAutocomplete, column.values.sort());
                        if (column.name === 'j.segm') angular.extend(jAutocomplete, column.values.sort());
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

    application.factory('filters_ag', [function() {
        var options = {
            collapse: true,
            block: true,
            origin: true,
            epitope: true
        };

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
            value: '',
            have_suggestions: false,
            show_suggestions: false,
            available_suggestions: [],
            suggestions: {}
        };

        var ag_pattern = {
            value: '',
            valid: true,
            substring: false
        };

        function setOptions(name, value) {
            options[name] = value;
        }

        function resetFilters() {
            ag_species.value = '';
            ag_gene.value = '';
            ag_sequence.value = '';
            ag_pattern.value = '';
        }

        function checkAntigenSequencePattern() {
            ag_pattern.value = ag_pattern.value.toUpperCase();

            var leftBracketStart = false;
            var error = false;

            if (ag_pattern.value.length > 100) return true;

            var allowed_chars = 'ARNDCQEGHILKMFPSTWYV';

            for (var i = 0; i < ag_pattern.value.length; i++) {
                var char = ag_pattern.value[i];
                if (char === '[') {
                    if (leftBracketStart === true) {
                        error = true;
                        break
                    }
                    leftBracketStart = true
                } else if (char === ']') {
                    if (leftBracketStart === false) {
                        error = true;
                        break;
                    } else if (ag_pattern.value[i - 1] === '[') {
                        error = true;
                        break;
                    }
                    leftBracketStart = false;
                } else {
                    if (char != 'X' && allowed_chars.indexOf(char) === -1 || char === ' ') {
                        error = true;
                        break;
                    }
                }
            }

            ag_pattern.valid = !(leftBracketStart || error);
        }

        function updateEpitopeSuggestions(newSuggestions) {
            angular.extend(ag_sequence.suggestions, newSuggestions);
        }

        function checkAntigenSequenceSuggestions() {
            ag_sequence.available_suggestions.splice(0, ag_sequence.available_suggestions.length)
            var values = ag_sequence.value.split(",");
            var have_suggestions = false;
            var added = [];
            angular.forEach(values, function(value) {
                added.push(value);
            });
            angular.forEach(values, function(value) {
                if (ag_sequence.suggestions.hasOwnProperty(value)) {
                    var suggestionsForValue = ag_sequence.suggestions[value];
                    angular.forEach(suggestionsForValue, function(suggestion) {
                        if (added.indexOf(suggestion.sequence) === -1) {
                            ag_sequence.available_suggestions.push(suggestion);
                            have_suggestions = true;
                        }
                    })
                }
            });
            ag_sequence.have_suggestions = have_suggestions;
        }

        function isAntigenSequenceValid() {
            return ag_pattern.valid;
        }

        function updateFilters(filters) {
            if (ag_species.value.length > 0) addCsTextFilterExact(filters, 'antigen.species', ag_species.value);
            if (ag_gene.value.length > 0) addCsTextFilterExact(filters, 'antigen.gene', ag_gene.value);

            if (ag_sequence.value.length > 0) addCsTextFilterExact(filters, 'antigen.epitope', ag_sequence.value);
            if (ag_pattern.value.length > 0) addSequencePatternFilter(filters, "antigen.epitope", ag_pattern.substring, ag_pattern.value);
        }

        return {
            options: options,
            ag_species: ag_species,
            ag_gene: ag_gene,
            ag_sequence: ag_sequence,
            ag_pattern: ag_pattern,
            setOptions: setOptions,
            updateFilters: updateFilters,
            resetFilters: resetFilters,
            isAntigenSequenceValid: isAntigenSequenceValid,
            checkAntigenSequencePattern: checkAntigenSequencePattern,
            checkAntigenSequenceSuggestions: checkAntigenSequenceSuggestions,
            updateEpitopeSuggestions: updateEpitopeSuggestions
        }
    }]);

    application.directive('filtersAg', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', 'filters_ag', function($scope, filters, filters_ag) {
                $scope.ag_options = filters_ag.options;
                $scope.ag_species = filters_ag.ag_species;
                $scope.ag_gene = filters_ag.ag_gene;
                $scope.ag_sequence = filters_ag.ag_sequence;
                $scope.ag_pattern = filters_ag.ag_pattern;

                $scope.appendAgSpecies = appendAgSpecies;
                $scope.appendAgGene = appendAgGene;
                $scope.appendAgSequence = appendAgSequence;
                $scope.appendAgSuggestion = appendAgSuggestion;

                $scope.checkAntigenSequenceSuggestions = filters_ag.checkAntigenSequenceSuggestions;
                $scope.checkAntigenSequencePattern = filters_ag.checkAntigenSequencePattern;
                $scope.isAntigenSequenceValid = filters_ag.isAntigenSequenceValid;

                var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
                    if (filters.columns.length != 0) {
                        findAutocompleteValues($scope.ag_species.autocomplete, $scope.ag_gene.autocomplete, $scope.ag_sequence.autocomplete, filters.columns);
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

                function appendAgSuggestion(name) {
                    appendAgSequence(name, true);
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

                function appendAgSequence(value, add_new = false) {
                    var x = $scope.ag_sequence.value.split(',');
                    var same_found = false;
                    for (var i = 0; i < x.length; i++) {
                        if (x[i] === value) {
                            same_found = true;
                            break;
                        }
                    }
                    if (!same_found) {
                        if (add_new) {
                            x.push(value)
                        } else {
                            x[x.length - 1] = value;
                        }
                        $scope.ag_sequence.value = x.join(",");
                        filters_ag.checkAntigenSequenceSuggestions();
                    }
                }
            }]
        }
    });

//////////////// MHC

    application.factory('filters_mhc', [function() {
        var options = {
            collapse: true,
            block: true,
            general: true,
            haplotype: true
        };

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

        function setOptions(name, value) {
            options[name] = value;
        }

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
            options: options,
            mhc_class: mhc_class,
            mhc_a: mhc_a,
            mhc_b: mhc_b,
            setOptions: setOptions,
            updateFilters: updateFilters,
            resetFilters: resetFilters
        }
    }]);

    application.directive('filtersMhc', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', 'filters_mhc', function($scope, filters, filters_mhc) {
                $scope.mhc_options = filters_mhc.options;
                $scope.mhc_class = filters_mhc.mhc_class;
                $scope.mhc_a = filters_mhc.mhc_a;
                $scope.mhc_b = filters_mhc.mhc_b;

                $scope.appendMhcA = appendMhcA;
                $scope.appendMhcB = appendMhcB;

                var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
                    if (filters.columns.length != 0) {
                        findAutocompleteValues($scope.mhc_a.autocomplete, $scope.mhc_b.autocomplete, filters.columns);
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

    application.factory('filters_meta', [function() {
        var options = {
            collapse: true,
            block: true,
            general: true,
            reliability: true
        };

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

        function setOptions(name, value) {
            options[name] = value;
        }

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
            min_conf_score.value = 0;
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
            options: options,
            pm_ids: pm_ids,
            meta_tags: meta_tags,
            min_conf_score: min_conf_score,
            setOptions: setOptions,
            updateFilters: updateFilters,
            resetFilters: resetFilters
        }
    }]);

    application.directive('filtersMeta', function() {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', 'filters_meta', function($scope, filters, filters_meta) {
                $scope.meta_options = filters_meta.options;
                $scope.pm_ids = filters_meta.pm_ids;
                $scope.meta_tags = filters_meta.meta_tags;
                $scope.min_conf_score = filters_meta.min_conf_score;

                $scope.appendPmId = appendPmId;

                var textColumnsWatcher = $scope.$watchCollection('textColumns', function() {
                    if (filters.columns.length != 0) {
                        findAutocompleteValues($scope.pm_ids.autocomplete, filters.columns);
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
