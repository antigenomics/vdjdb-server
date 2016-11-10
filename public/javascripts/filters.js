(function() {
    "use strict";
    var application = angular.module('filters', ['ngWebSocket', 'table', 'notifications']);

    application.factory('filters', ['$websocket', 'table', 'notify', function ($websocket, table, notify) {

        var textFilters = [];
        var sequenceFilters = [];
        var textFilterID = 0;
        var sequenceFilterID = 0;

        var textFiltersHide = false
        var sequenceFiltersHide = false

        var columnsLoading = true;
        var presetsLoading = true;
        var error = false;

        var textFiltersColumns = [];
        var sequenceFiltersColumns = [];
        var sequencePresets = [];
        var customPreset = {
            name: 'custom'
        };

        var connection = $websocket('ws://' + location.host + '/filters/connect');
        var pingWebSocket = null;

        var hints = {
            "Gene": "<p>TCR chain</p><p><em>TRA</em> or <em>TRB</em></p>",
            "CDR3": "<p>Amino acid sequence</p><p>Example: <em>CASSLAPGATNEKLFF</em> (Full match), <em>CASSLAPGAT</em> or <em>LAPGAT</em> (Substring match)</p>",
            "V": "<p>TCR Variable segment</p><p>Example: <em>TRBV7-2*02</em> (Full match), <em>TRBV7-2</em> or <em>TRBV7-2*02</em> (Substring match).</p><p>Start typing to see full list</p>",
            "J": "<p>TCR Joining segment</p><p>Example: <em>TRBJ1-6*01</em> (Full match), <em>TRBJ1-6</em> or <em>TRBJ1</em> (Substring match).</p><p>Start typing to see full list</p>",
            "Species": "<p>Host species of TCR sequence</p><p>Example: <em>HomoSapiens</em>, <em>MusMusculus</em> or <em>MacacaMulatta</em>.</p><p>Start typing to see full list</p>",
            "MHC.A": "<p>Identifier of first MHC chain</p><p>Example: <em>HLA-A*02:01:48</em> (Full match), <em>HLA-A*02:01</em> or <em>HLA-A*02</em> (Substring match).</p><p>Start typing to see full list</p>",
            "MHC.B": "<p>Identifier of second MHC chain</p><p>Example: <em>HLA-DRB5*01:01:01</em> (Full match), <em>HLA-DRB5*01</em> (Substring match); B2M for MHC class I.</p><p>Start typing to see full list</p>",
            "MHC.class": "<p>MHCI or MHCII</p>",
            "Antigen.Epitope": "<p>Amino acid sequence</p><p>Example: <em>NLVPMVATV</em>.</p><p>Start typing to see full list</p>",
            "Antigen.Gene": "<p>Parent gene of an epitope</p><p>Example: <em>EBNA1</em>.</p><p>Start typing to see full list</p>",
            "Antigen.Gene": "<p>Parent species of an epitope</p><p>Example: <em>CMV</em>.</p><p>Start typing to see full list</p>",
            "Antigen.Gene": "<p>Parent species of an epitope</p><p>Example: <em>CMV</em>.</p><p>Start typing to see full list</p>",
            "Reference": "<p>Pubmed ID, URL or submitter details if unpublished.</p>",
            "score": "<p>VDJdb confidence score for record identification method</p><p>Example: <em>1</em> will search for records with score greater or equal to 1.</p><p>Score range: 0-3 (low confidence - extremely high confidence), using 1 is recommended</p>"
            "Frequency": "<p>Share of TCR sequence across all sequences identified for a given epitope in a given assay.</p><p>Example: <em>0.1</em> will search for records represented by 10% or more cells.</p>",
            "Method": "<p>Search for specific assay details using keywords.</p><p>Example: <em>single-cell</em> will show assays using single-cell sequencing, <em>sort</em> will show all assays using multimer sorting, <em>tetramer</em> will show all assays using tetramers.</p><p>Multiple values can be supplied separated by comma</p>"
        }

        var textFiltersTypes = Object.freeze([
            { name: 'substring', title: 'Substring match', allowNegative: true, description: 'substring' },
            { name: 'exact', title: 'Full match', allowNegative: true, description: 'exact' },
            { name: 'level', title: 'Greater or equals', allowNegative: true, description: 'level' },
            { name: 'frequency', title: 'Greater or equals', allowNegative: true, description: 'frequency' },
            { name: 'identification', title: 'Tags and keywords', allowNegative: true, description: 'identification' }  
        ]);

        connection.onOpen(function() {
            connection.send({
                action: 'columns',
                data: {}
            });
            connection.send({
                action: 'presets',
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
                        case 'presets':
                            presets(response.presets);
                            presetsLoading = false;
                            break;
                        case 'compute_recall':
                            filter = findSequenceFilterById(response.id);
                            filter.loading = false;
                            filter.recall = response.value;
                            filter.preset = customPreset;
                            break;
                        case 'compute_precision':
                            filter = findSequenceFilterById(response.id);
                            filter.loading = false;
                            filter.precision = response.value;
                            filter.preset = customPreset;
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

        function initialize(columns) {
            angular.forEach(columns, function(column) {
                var meta = column.metadata;
                if (meta.searchable === '1') {
                    if (meta.columnType === 'txt') {
                        textFiltersColumns.push({
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
                        textFiltersColumns.push({
                            name: column.name,
                            title: meta.title,
                            types: [0, 1],
                            allowNegative: true,
                            autocomplete: false,
                            values: [],
                            defaultFilterType: textFiltersTypes[1]
                        });
                        sequenceFiltersColumns.push({
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
            textFiltersColumns.push({
                name: 'method',
                title: 'Frequency',
                types: [3],
                allowNegative: false,
                autocomplete: false,
                values: [],
                defaultFilterType: textFiltersTypes[3]
            });
            textFiltersColumns.push({
                name: 'method',
                title: 'Method',
                types: [4],
                allowNegative: false,
                autocomplete: false,
                values: [],
                defaultFilterType: textFiltersTypes[4]
            })
            columnsLoading = false;
        }

        function presets(newPresets) {
            sequencePresets.splice(0, sequencePresets.length);
            angular.extend(sequencePresets, newPresets);
            presetsLoading = false
        }

        function getTextFiltersColumns() {
            return textFiltersColumns;
        }

        function getTextFiltersTypes() {
            return textFiltersTypes;
        }

        function getTextFilters() {
            return textFilters;
        }

        function addTextFilter() {
            if (!error && !columnsLoading) {
                textFilters.push({
                    id: textFilterID++,
                    columnId: '',
                    columnTitle: 'Please select column name:',
                    value: '',
                    filterType: textFiltersTypes[1],
                    negative: false,
                    types: [0, 1, 2],
                    activeColumn: false,
                    activeType: false,
                    inputFocused: false,
                    column: {}
                });
                showTextFiltersPopover();
            }
        }

        function deleteTextFilter(filter) {
            var index = textFilters.indexOf(filter);
            if (index >= 0) textFilters.splice(index, 1);
            showTextFiltersPopover();
            return index;
        }

        function findTextFilterById(id) {
            for (var i = 0; i < textFilters.length; i++) {
                if (textFilters[i].id === id) return textFilters[i];
            }
            return {};
        }

        function getSequenceFiltersColumns() {
            return sequenceFiltersColumns;
        }

        function getSequenceFilters() {
            return sequenceFilters;
        }

        function addSequenceFilter() {
            sequenceFilters.push({
                id: sequenceFilterID++,
                columnTitle: 'Please select column name: ',
                columnId: '',
                query: '',
                //preset: sequencePresets[0],
                //presetName: sequencePresets[0].name,
                //mismatches: sequencePresets[0].mismatches,
                mismatches: 2,
                //insertions: sequencePresets[0].insertions,
                insertions: 1,
                //deletions: sequencePresets[0].deletions,
                deletions: 1,
                //mutations: sequencePresets[0].mutations,
                mutations: 2,
                //precision: -1.0,
                //recall: -1.0,
                activeColumn: false,
                //activePreset: false,
                loading: false
            });
            showSequenceFiltersPopover();
        }

        function deleteSequenceFilter(filter) {
            var index = sequenceFilters.indexOf(filter);
            if (index >= 0) sequenceFilters.splice(index, 1);
            showSequenceFiltersPopover();
            return index;
        }

        function findSequenceFilterById(id) {
            for (var i = 0; i < sequenceFilters.length; i++) {
                if (sequenceFilters[i].id === id) return sequenceFilters[i];
            }
            return {};
        }

        function isFiltersLoaded() {
            return !columnsLoading && !presetsLoading;
        }

        function isFiltersError() {
            return error;
        }

        function getDefaultFilterTypes() {
            return textFiltersTypes;
        }

        function getFiltersRequest() {
            var textFiltersRequest = [];

            angular.forEach(textFilters, function(filter) {
                textFiltersRequest.push({
                    columnId: filter.columnId,
                    value: filter.value,
                    filterType: filter.filterType.name,
                    negative: filter.negative
                })
            });

            return {
                textFilters: textFiltersRequest,
                sequenceFilters: sequenceFilters
            }
        }

        function getPresets() {
            return sequencePresets;
        }

        function filtersInit(callback) {
            callback(textFilters, sequenceFilters)
            setTimeout(function() {
                showTextFiltersPopover();
                showSequenceFiltersPopover();
            }, 300);
        }

        function getRecallByPrecision(filter) {
            filter.loading = true;
            connection.send({
                action: 'compute_recall',
                data: {
                    value: filter.precision,
                    id: filter.id
                }
            })
        }

        function getPrecisionByRecall(filter) {
            filter.loading = true;
            connection.send({
                action: 'compute_precision',
                data: {
                    value: filter.recall,
                    id: filter.id
                }
            })
        }

        function isTextFiltersHidden() {
            return textFiltersHide;
        }

        function isSequenceFiltersHidden() {
            return sequenceFiltersHide;
        }

        function hideTextFilters() {
            textFiltersHide = true;
        }

        function hideSequenceFilters() {
            sequenceFiltersHide = true;
        }

        function showTextFiltersPopover() {
            //TODO: Overhead, no need to destroy each time    
            setTimeout(function() {
                angular.forEach(textFilters, function(filter) {
                    var column = table.columnByName(filter.columnId);
                    $("#filter_hint_" + filter.id).popover('destroy');
                    $("#filter_hint_" + filter.id).popover({
                        placement: 'top',
                        container: 'body',
                        html: 'true',
                        trigger: 'hover',
                        animation: false,
                        content: '<div>' + (column == null ? 'Please select column name' :  hints[filter.columnTitle]) + '</div>'// +
                                 //'<hr>'+
                                 //'<div>' + filter.filterType.title + ': ' + filter.filterType.description + '</div>'
                    });
                });
            }, 100);
        }

        function showSequenceFiltersPopover() {
            //TODO: Overhead, no need to destroy each time    
            setTimeout(function() {
                angular.forEach(sequenceFilters, function(filter) {
                    var column = table.columnByName(filter.columnId);
                    $("#filter_hint_seq_" + filter.id).popover('destroy');
                    $("#filter_hint_seq_" + filter.id).popover({
                        placement: 'top',
                        container: 'body',
                        html: 'true',
                        trigger: 'hover',
                        animation: false,
                        content: '<div>' + (column == null ? 'Please select column name' : hints[filter.columnTitle]) + '</div>'// +
                                 //'<hr>'+
                                 //'<div>' + filter.filterType.title + ': ' + filter.filterType.description + '</div>'
                    });
                });
            }, 100);   
        }

        return {
            initialize: initialize,
            presets: presets,
            getTextFiltersColumns: getTextFiltersColumns,
            getTextFiltersTypes: getTextFiltersTypes,
            getTextFilters: getTextFilters,
            addTextFilter: addTextFilter,
            deleteTextFilter: deleteTextFilter,
            findTextFilterById: findTextFilterById,
            getSequenceFiltersColumns: getSequenceFiltersColumns,
            getSequenceFilters: getSequenceFilters,
            addSequenceFilter: addSequenceFilter,
            deleteSequenceFilter: deleteSequenceFilter,
            findSequenceFilterById: findSequenceFilterById,
            isFiltersLoaded: isFiltersLoaded,
            isFiltersError: isFiltersError,
            getDefaultFilterTypes: getDefaultFilterTypes,
            getFiltersRequest: getFiltersRequest,
            getPresets: getPresets,
            filtersInit: filtersInit,
            getRecallByPrecision: getRecallByPrecision,
            getPrecisionByRecall: getPrecisionByRecall,
            hideTextFilters: hideTextFilters,
            hideSequenceFilters: hideSequenceFilters,
            isTextFiltersHidden: isTextFiltersHidden,
            isSequenceFiltersHidden: isSequenceFiltersHidden,
            showTextFiltersPopover: showTextFiltersPopover,
            showSequenceFiltersPopover: showSequenceFiltersPopover

        }
    }]);

    application.filter('filterBySubstring', function() {
        return function(data, value) {
            if (data instanceof Array) {
                return data.filter(function(item) {
                    return item.indexOf(value) !== -1;
                })
            } else {
                return []
            }
        }

    })


    application.directive('filters', function () {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', function ($scope, filters) {
                // $scope.sliderOptions = {
                //     min: 0,
                //     max: 1,
                //     step: 1e-2,
                //     value: 0
                // };

                $scope.textFilters = filters.getTextFilters();
                $scope.textFiltersColumns = filters.getTextFiltersColumns();
                $scope.textFiltersTypes = filters.getTextFiltersTypes();
                $scope.addTextFilter = filters.addTextFilter;
                $scope.deleteTextFilter = filters.deleteTextFilter;

                $scope.sequenceFilters = filters.getSequenceFilters();
                $scope.sequenceFiltersColumns = filters.getSequenceFiltersColumns();
                $scope.addSequenceFilter = filters.addSequenceFilter;
                $scope.deleteSequenceFilter = filters.deleteSequenceFilter;

                $scope.isTextFiltersHidden = filters.isTextFiltersHidden;
                $scope.isSequenceFiltersHidden = filters.isSequenceFiltersHidden;

                //$scope.presets = filters.getPresets();

                $scope.isFiltersLoaded = filters.isFiltersLoaded;
                $scope.isFiltersError = filters.isFiltersError;

                $scope.isTextFiltersExist = function () {
                    return $scope.textFilters.length > 0;
                };


                $scope.isSequenceFiltersExist = function() {
                    return $scope.sequenceFilters.length > 0;
                };

                $scope.switchColumnVisible = function(filter) {
                    filter.activeColumn = !filter.activeColumn;
                };

                $scope.isColumnActive = function(filter) {
                    return filter.activeColumn;
                };

                $scope.clickTextColumn = function(filter, column) {
                    filter.value = '';
                    filter.columnId = column.name;
                    filter.columnTitle = column.title;
                    filter.types = column.types;
                    filter.filterType = column.defaultFilterType;
                    filter.negative = false;
                    filter.activeColumn = false;
                    filter.column = column;
                    filter.inputFocused = false;
                    filters.showTextFiltersPopover();
                };

                $scope.clickSequenceColumn = function(filter, column) {
                    filter.value = '';
                    filter.columnId = column.name;
                    filter.columnTitle = column.title;
                    filter.activeColumn = false;
                    filters.showSequenceFiltersPopover();
                };

                $scope.switchTypeVisible = function(filter) {
                    if (filter.types.length !== 1) {
                        filter.activeType = !filter.activeType;
                    }
                };

                $scope.isTypeActive = function(filter) {
                    return filter.activeType;
                };

                $scope.clickType = function(filter, typeIndex) {
                    filter.filterType = $scope.textFiltersTypes[typeIndex];
                    filter.activeType = false;
                };

                //Preset feature in development
                // $scope.switchPresetVisible = function(filter) {
                //     filter.activePreset = !filter.activePreset;
                // };

                // $scope.isPresetActive = function(filter) {
                //     return filter.activePreset;
                // };

                // $scope.clickPreset = function(filter, preset) {
                //     filter.preset = preset;
                //     filter.precision = 0.0;
                //     filter.recall = 0.0;
                //     filter.mismatches = preset.mismatches;
                //     filter.insertions = preset.insertions;
                //     filter.deletions = preset.deletions;
                //     filter.mutations = preset.mutations;
                //     filter.threshold = preset.threshold;
                //     filter.presetName = preset.name;
                //     filter.activePreset = false;
                // };

                // $scope.precisionStopSlide = function precisionStopSlide(filter) {
                //     filters.getRecallByPrecision(filter)
                // };

                // $scope.recallStopSlide = function recallStopSlide(filter) {
                //     filters.getPrecisionByRecall(filter)
                // };

            }]
        }
    });

}());